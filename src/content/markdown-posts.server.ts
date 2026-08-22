import "@tanstack/react-start/server-only";

import { getPublishedMarkdownSource, getPublishedMarkdownSources } from "./markdown-posts";
import type { MarkdownSource } from "./markdown-source";
import { getRenderedPost } from "./rendered-posts";
import type { Post } from "./types";

async function render(source: MarkdownSource): Promise<Post> {
  const rendered = getRenderedPost(source.slug);
  if (!rendered) {
    throw new Error(`Rendered Markdown is missing for post: ${source.slug}`);
  }

  return {
    ...source.summary,
    content: {
      format: "markdown",
      markdown: source.markdown,
      html: rendered.html,
      toc: rendered.toc,
    },
  };
}

export async function findPostBySlug(slug: string) {
  const source = getPublishedMarkdownSource(slug);
  return source ? render(source) : undefined;
}

export async function listAllPosts() {
  return Promise.all(getPublishedMarkdownSources().map(render));
}
