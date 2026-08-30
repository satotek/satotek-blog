import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parsePostSource, type PostSource } from "../src/lib/posts/post-source";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const postsDirectory = join(projectRoot, "src/content/posts");
const generatedDirectory = join(projectRoot, "src/content/.generated");

async function readPostSources(): Promise<PostSource[]> {
  const entries = await readdir(postsDirectory, { withFileTypes: true });
  const sources: PostSource[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    const markdown = await readFile(join(postsDirectory, slug, "index.mdx"), "utf8");
    sources.push(parsePostSource(markdown, slug));
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

/**
 * 本文と目次は MDX モジュールが直接持つので、ここで書き出すのは一覧用のサマリだけ。
 * 別ファイルにしておくことで、ブラウザ側が Markdown 原文・yaml パーサ・zod を
 * 読み込まずに済む。
 */
async function main() {
  const sources = await readPostSources();

  await mkdir(generatedDirectory, { recursive: true });
  await writeAtomically(
    join(generatedDirectory, "summaries.json"),
    `${JSON.stringify(sources.map((source) => source.summary))}\n`,
  );

  for (const entry of await readdir(generatedDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name === "summaries.json") continue;
    await rm(join(generatedDirectory, entry.name), { force: true });
  }

  console.log(`Generated summaries for ${sources.length} posts.`);
}

await main();
