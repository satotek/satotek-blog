import { defineHandler } from "void";

import type { GithubSnapshot } from "#/core/github";

import { api, apiEnv, respondCached } from "../_api";

export const GET = defineHandler<GithubSnapshot>((c) =>
  respondCached(c, () => api.github(apiEnv(c))),
);
