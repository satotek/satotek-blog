import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMarkdownRenderer } from "@satotek/content-pipeline";
import { parseMarkdownSource, type MarkdownSource } from "../src/content/markdown-source";
import { createResponsiveMedia } from "../src/lib/media-variants";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const postsDirectory = join(projectRoot, "content/posts");
const generatedDirectory = join(projectRoot, "content/.generated");
const wasmPath = join(projectRoot, "packages/content-pipeline/assets/onig.wasm");
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

async function main() {
  const [sources, wasm] = await Promise.all([readMarkdownSources(), readFile(wasmPath)]);
  const renderer = createMarkdownRenderer(wasm, {
    resolveImage: (source) =>
      createResponsiveMedia(source, {
        baseUrl: mediaBaseUrl,
        sizes: "(max-width: 768px) 100vw, 768px",
      }),
  });

  await rm(generatedDirectory, { recursive: true, force: true });
  await mkdir(generatedDirectory, { recursive: true });

  for (const source of sources) {
    const rendered = await renderer.renderMarkdown(source.markdown);
    const outputPath = join(generatedDirectory, `${source.slug}.json`);
    await writeFile(outputPath, `${JSON.stringify(rendered)}\n`, "utf8");
  }

  console.log(`Generated ${sources.length} rendered Markdown posts.`);
}

await main();
