import "@tanstack/react-start/server-only";

import { getPublishedPostSource, getPublishedPostSources } from "./post-sources.server";
import type { PostSummary } from "./types";

// 本文と目次は MDX モジュールが持ち、原文は llms-full.txt がサーバー側で直接読む。
// ここからクライアントへ渡すのはサマリだけでよい。
export async function findPostBySlug(slug: string): Promise<PostSummary | undefined> {
  return getPublishedPostSource(slug)?.summary;
}

export async function listAllPosts(): Promise<readonly PostSummary[]> {
  return getPublishedPostSources().map((source) => source.summary);
}
