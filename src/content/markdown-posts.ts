import { parseMarkdownSource, type MarkdownSource } from "./markdown-source";
import type { Post, PostListOptions, PostRepository } from "./types";

const sources = import.meta.glob<string>("./posts/*/index.md", {
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

async function render(source: MarkdownSource): Promise<Post> {
  const { renderMarkdown } = await import("./markdown-parser");
  const { html, toc } = renderMarkdown(source.markdown);

  return {
    ...source.summary,
    content: {
      format: "markdown",
      markdown: source.markdown,
      html,
      toc,
    },
  };
}

export class MarkdownPostRepository implements PostRepository {
  async list(options: PostListOptions = {}) {
    return markdownSources
      .filter((source) => !source.draft)
      .filter((source) => matches(source, options))
      .map((source) => source.summary);
  }

  async listAll() {
    return Promise.all(publishedSources.map(render));
  }

  async findBySlug(slug: string) {
    const source = publishedSources.find((candidate) => candidate.slug === slug);
    return source ? render(source) : undefined;
  }
}
