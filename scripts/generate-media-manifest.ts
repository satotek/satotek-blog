import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMarkdownRenderer, readImageDimensions } from "@satotek/content-pipeline";
import { parseMarkdownSource } from "../src/content/markdown-source";
import { mediaKeyFromUrl, type MediaManifest } from "../src/lib/media-manifest";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const postsDirectory = join(projectRoot, "content/posts");
const manifestPath = join(projectRoot, "content/media-manifest.json");
const wasmPath = join(projectRoot, "packages/content-pipeline/assets/onig.wasm");
const mediaBaseUrl = (
  process.env.R2_PUBLIC_BASE_URL?.trim() ||
  process.env.VITE_MEDIA_BASE_URL?.trim() ||
  "https://img.satotek.dev"
).replace(/\/+$/, "");

async function readManifest(): Promise<MediaManifest> {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as MediaManifest;
  } catch {
    return {};
  }
}

/**
 * 記事に登場する画像 URL を集める。Markdown を正規表現で漁ると記法の揺れに弱いので、
 * レンダラの resolveImage フックを覗き穴として使い、実際に img になったものだけを拾う。
 */
async function collectImageSources(slugs: readonly string[]) {
  const sources = new Map<string, string>();
  const wasm = await readFile(wasmPath);
  let currentSlug = "";
  const renderer = createMarkdownRenderer(wasm, {
    resolveImage: (source) => {
      if (!sources.has(source)) sources.set(source, currentSlug);
      return undefined;
    },
  });

  for (const slug of slugs) {
    currentSlug = slug;
    const markdown = await readFile(join(postsDirectory, slug, "index.md"), "utf8");
    await renderer.renderMarkdown(parseMarkdownSource(markdown, slug).markdown);
  }

  return sources;
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
      manifest[key] = dimensions;
      console.log(`${key} -> ${dimensions.width}x${dimensions.height}`);
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
