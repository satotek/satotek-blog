import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMarkdownRenderer } from "../src/content/markdown-parser";
import { parseMarkdownSource, type MarkdownSource } from "../src/content/markdown-source";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const postsDirectory = join(projectRoot, "src/content/posts");
const generatedDirectory = join(projectRoot, "src/content/generated");
const wasmPath = join(projectRoot, "src/assets/onig.wasm");

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
  const renderer = createMarkdownRenderer(wasm);

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
