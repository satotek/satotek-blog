import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MEDIA_VARIANT_FORMATS,
  MEDIA_VARIANT_WIDTHS,
  readImageDimensions,
  type MediaVariantFormat,
} from "@satotek/content-pipeline";
import { mediaKeyFromUrl, type MediaManifest } from "../src/lib/media-manifest";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const postsDirectory = join(projectRoot, "content/posts");
const manifestPath = join(projectRoot, "content/media-manifest.json");
const mediaBaseUrl = (
  process.env.R2_PUBLIC_BASE_URL?.trim() ||
  process.env.VITE_MEDIA_BASE_URL?.trim() ||
  "https://img.satotek.dev"
).replace(/\/+$/, "");
const rasterExtensions = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);

async function readManifest(): Promise<MediaManifest> {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as MediaManifest;
  } catch {
    return {};
  }
}

/**
 * 記事に登場する画像 URL を集める。MDX は React へコンパイルされるため
 * レンダラを覗き穴には使えない。原文から Markdown 画像と JSX の src を拾う。
 */
async function collectImageSources(slugs: readonly string[]) {
  const sources = new Map<string, string>();
  const patterns = [
    /!\[[^\]]*\]\(\s*(\S+?)(?:\s+"[^"]*")?\s*\)/g,
    /<[A-Za-z][^>]*\ssrc=["']([^"']+)["']/g,
  ];

  for (const slug of slugs) {
    const markdown = await readFile(join(postsDirectory, slug, "index.mdx"), "utf8");
    for (const pattern of patterns) {
      for (const match of markdown.matchAll(pattern)) {
        const source = match[1];
        if (source && !sources.has(source)) sources.set(source, slug);
      }
    }
  }

  return sources;
}

async function probeVariantFormats(
  source: string,
): Promise<{ failed: boolean; formats: MediaVariantFormat[] }> {
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return { failed: false, formats: [] };
  }

  const extension = extname(sourceUrl.pathname).toLowerCase();
  if (!rasterExtensions.has(extension)) return { failed: false, formats: [] };

  const basePath = sourceUrl.pathname.slice(0, -extension.length);
  const probeWidth = MEDIA_VARIANT_WIDTHS[0];
  let failed = false;
  const formats = (
    await Promise.all(
      MEDIA_VARIANT_FORMATS.map(async (format) => {
        const variantUrl = new URL(
          `${basePath}-${probeWidth}.${format}`,
          `${mediaBaseUrl.replace(/\/+$/, "")}/`,
        );
        try {
          const response = await fetch(variantUrl, { method: "HEAD" });
          return response.ok ? format : undefined;
        } catch {
          failed = true;
          return undefined;
        }
      }),
    )
  ).filter((format): format is MediaVariantFormat => format !== undefined);

  return { failed, formats };
}

/**
 * 原本はまずリポジトリ内の assets を見る。過去にアップロードしただけで
 * ローカルに残っていない画像は、配信 URL から取得して寸法を読む。
 */
async function loadImageBytes(source: string, slug: string): Promise<Buffer> {
  const localPath = join(postsDirectory, slug, "assets", basename(new URL(source).pathname));

  try {
    return await readFile(localPath);
  } catch {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source} (HTTP ${response.status})`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}

async function main() {
  const entries = await readdir(postsDirectory, { withFileTypes: true });
  const slugs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  const previous = await readManifest();
  const sources = await collectImageSources(slugs);
  const manifest: MediaManifest = {};

  for (const [source, slug] of [...sources].sort(([left], [right]) => left.localeCompare(right))) {
    const key = mediaKeyFromUrl(source, mediaBaseUrl);
    if (!key) continue;

    try {
      const dimensions = await readImageDimensions(await loadImageBytes(source, slug));
      if (!dimensions) throw new Error("No intrinsic dimensions");
      const previousEntry = previous[key];
      const probed = await probeVariantFormats(source);
      const formats = probed.failed ? (previousEntry?.formats ?? probed.formats) : probed.formats;
      manifest[key] = {
        ...dimensions,
        ...(formats.length > 0 ? { formats } : {}),
      };
      const formatLabel = formats.length > 0 ? ` [${formats.join(", ")}]` : "";
      console.log(`${key} -> ${dimensions.width}x${dimensions.height}${formatLabel}`);
    } catch (error) {
      const fallback = previous[key];
      if (!fallback) throw error;
      // 取得に失敗しても、既に判明している寸法を取りこぼしてビルドを退行させない。
      manifest[key] = fallback;
      console.warn(`${key} -> kept ${fallback.width}x${fallback.height} (${String(error)})`);
    }
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, undefined, 2)}\n`, "utf8");
  console.log(`Wrote ${Object.keys(manifest).length} entries to content/media-manifest.json.`);
}

await main();
