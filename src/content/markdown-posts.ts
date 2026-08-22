import { parseMarkdownSource, type MarkdownSource } from "./markdown-source";
import type { PostListOptions, PostSummary, PostSummaryRepository } from "./types";

const sources = import.meta.glob<string>("../../content/posts/*/index.md", {
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

function matches(source: MarkdownSource, options: PostListOptions) {
  if (options.category && source.summary.category !== options.category) return false;
  if (options.tag && !source.summary.tags.includes(options.tag)) return false;
  return true;
}

export function listMarkdownPostSummaries(options: PostListOptions = {}): readonly PostSummary[] {
  return publishedSources
    .filter((source) => matches(source, options))
    .map((source) => source.summary);
}

export function getPublishedMarkdownSource(slug: string) {
  return publishedSources.find((source) => source.slug === slug);
}

export function getPublishedMarkdownSources() {
  return publishedSources;
}

export class MarkdownPostSummaryRepository implements PostSummaryRepository {
  async list(options: PostListOptions = {}) {
    return listMarkdownPostSummaries(options);
  }
}
