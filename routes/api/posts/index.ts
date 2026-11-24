import { defineHandler } from "void";

import type { PostListResult } from "#/core/posts/query";

import { api, respond } from "../../_api";

export const GET = defineHandler<PostListResult>((c) =>
  respond(() => api.listPosts(c.req.query())),
);
