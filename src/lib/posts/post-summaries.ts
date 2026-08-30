import type { PostListOptions, PostSummary, PostSummaryRepository } from "./types";

// 一覧が使うのは generate-content が書き出したサマリだけ。原文と
// フロントマター検証はサーバー側（markdown-sources.server.ts）に閉じている。
import summaries from "../../content/.generated/summaries.json";

const publishedSummaries = summaries as readonly PostSummary[];

function matches(summary: PostSummary, options: PostListOptions) {
  if (options.category && summary.category !== options.category) return false;
  if (options.tag && !summary.tags.includes(options.tag)) return false;
  return true;
}

export function listPostSummaries(options: PostListOptions = {}): readonly PostSummary[] {
  return publishedSummaries.filter((summary) => matches(summary, options));
}

export class PostSummaryRepositoryImpl implements PostSummaryRepository {
  async list(options: PostListOptions = {}) {
    return listPostSummaries(options);
  }
}
