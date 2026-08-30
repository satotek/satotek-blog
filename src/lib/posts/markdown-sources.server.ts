import "@tanstack/react-start/server-only";

import { parseMarkdownSource, type MarkdownSource } from "./markdown-source";

// Markdown 原文の読み込みとフロントマターの検証はここだけで行う。
// このモジュールはサーバー限定。クライアントへ漏れると原文・yaml・zod を
// まるごとバンドルに載せてしまうため、必ず server-only 側に置く。
const sources = import.meta.glob<string>("../../content/posts/*/index.mdx", {
  eager: true,
  import: "default",
  query: "?raw",
});

function slugFromPath(filePath: string) {
  const slug = filePath.split("/").at(-2);
  if (!slug) throw new Error(`Unable to derive post slug from ${filePath}`);
  return slug;
}

const markdownSources: readonly MarkdownSource[] = Object.entries(sources)
  .map(([filePath, source]) => parseMarkdownSource(source, slugFromPath(filePath)))
  .sort(
    (a, b) =>
      b.summary.date.localeCompare(a.summary.date) || a.summary.slug.localeCompare(b.summary.slug),
  );

const publishedSources = markdownSources.filter((source) => !source.draft);

export function getPublishedMarkdownSource(slug: string) {
  return publishedSources.find((source) => source.slug === slug);
}

export function getPublishedMarkdownSources() {
  return publishedSources;
}
