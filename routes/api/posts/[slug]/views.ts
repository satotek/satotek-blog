import { defineHandler } from "void";

import type { PostViewsResult } from "#/core/analytics/types";

import { api, apiEnv, respond, respondCached } from "../../../_api";

export const GET = defineHandler<PostViewsResult>((c) => {
  const slug = c.req.param("slug") ?? "";
  // 存在しない slug でキャッシュを埋めないよう、キャッシュより先に確かめる。
  if (!api.postExists(slug)) return respond(() => api.post(slug));
  return respondCached(c, () => api.postViews(slug, apiEnv(c)));
});
