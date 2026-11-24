import { defineHandler } from "void";

import type { PopularPostsResult } from "#/core/analytics/types";

import { api, apiEnv, respondCached } from "../../_api";

export const GET = defineHandler<PopularPostsResult>((c) =>
  respondCached(c, () => api.popular(apiEnv(c))),
);
