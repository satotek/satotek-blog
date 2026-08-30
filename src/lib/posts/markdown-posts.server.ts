import "@tanstack/react-start/server-only";

import { getPublishedMarkdownSource, getPublishedMarkdownSources } from "./markdown-sources.server";
import type { MarkdownSource } from "./markdown-source";
import type { Post } from "./types";

function toPost(source: MarkdownSource): Post {
  return {
    ...source.summary,
    content: { format: "mdx", markdown: source.markdown },
  };
}

export async function findPostBySlug(slug: string) {
  const source = getPublishedMarkdownSource(slug);
  return source ? toPost(source) : undefined;
}

export async function listAllPosts() {
  return getPublishedMarkdownSources().map(toPost);
}
