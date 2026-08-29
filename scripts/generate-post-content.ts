import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMarkdownRenderer } from "@satotek/content-pipeline";
import { parseMarkdownSource, type MarkdownSource } from "../src/content/markdown-source";
import { createResponsiveMedia } from "../src/lib/media-variants";
import { mediaKeyFromUrl, type MediaManifest } from "../src/lib/media-manifest";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const postsDirectory = join(projectRoot, "content/posts");
const generatedDirectory = join(projectRoot, "content/.generated");
const wasmPath = join(projectRoot, "packages/content-pipeline/assets/onig.wasm");
const manifestPath = join(projectRoot, "content/media-manifest.json");
const mediaBaseUrl = (
  process.env.R2_PUBLIC_BASE_URL?.trim() ||
  process.env.VITE_MEDIA_BASE_URL?.trim() ||
  "https://img.satotek.dev"
).replace(/\/+$/, "");

async function readMarkdownSources(): Promise<MarkdownSource[]> {
  const entries = await readdir(postsDirectory, { withFileTypes: true });
  const sources: MarkdownSource[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    const markdownPath = join(postsDirectory, slug, "index.md");
    const markdown = await readFile(markdownPath, "utf8");
    sources.push(parseMarkdownSource(markdown, slug));
  }

  return sources
    .filter((source) => !source.draft)
    .sort(
      (left, right) =>
        right.summary.date.localeCompare(left.summary.date) ||
        left.summary.slug.localeCompare(right.summary.slug),
    );
}

async function writeAtomically(path: string, content: string) {
  const temporaryPath = `${path}.tmp-${process.pid}`;

  try {
    await writeFile(temporaryPath, content, "utf8");
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function readMediaManifest(): Promise<MediaManifest> {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8")) as MediaManifest;
  } catch {
    console.warn("No content/media-manifest.json; run `bun run generate-media-manifest`.");
    return {};
  }
}

async function main() {
  const [sources, wasm, manifest] = await Promise.all([
    readMarkdownSources(),
    readFile(wasmPath),
    readMediaManifest(),
  ]);
  const missingDimensions = new Set<string>();

  const renderer = createMarkdownRenderer(wasm, {
    resolveImage: (source) => {
      const responsive = createResponsiveMedia(source, {
        baseUrl: mediaBaseUrl,
        sizes: "(max-width: 768px) 100vw, 768px",
      });

      const key = mediaKeyFromUrl(source, mediaBaseUrl);
      const dimensions = key ? manifest[key] : undefined;
      if (key && !dimensions) missingDimensions.add(key);

      if (!responsive && !dimensions) return undefined;
      return { ...responsive, ...dimensions };
    },
  });

  await mkdir(generatedDirectory, { recursive: true });

  const generatedFiles = new Set(["summaries.json"]);

  for (const source of sources) {
    const rendered = await renderer.renderMarkdown(source.markdown);
    const outputPath = join(generatedDirectory, `${source.slug}.json`);
    await writeAtomically(outputPath, `${JSON.stringify(rendered)}\n`);
    generatedFiles.add(`${source.slug}.json`);
  }

  // 一覧が必要とするのはサマリだけ。これを別ファイルにしておくことで、
  // ブラウザ側が Markdown 原文・yaml パーサ・zod を読み込まずに済む。
  await writeAtomically(
    join(generatedDirectory, "summaries.json"),
    `${JSON.stringify(sources.map((source) => source.summary))}\n`,
  );

  for (const entry of await readdir(generatedDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".json") || generatedFiles.has(entry.name))
      continue;
    await rm(join(generatedDirectory, entry.name), { force: true });
  }

  // 寸法が無い画像は読み込みまで高さ 0 で描かれ、レイアウトシフトとして表面化する。
  for (const key of [...missingDimensions].sort()) {
    console.warn(`No dimensions for ${key}; run \`bun run generate-media-manifest\`.`);
  }

  console.log(`Generated ${sources.length} rendered Markdown posts.`);
}

await main();
