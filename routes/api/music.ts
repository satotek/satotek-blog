import { defineHandler } from "void";

import type { MusicSnapshot } from "#/core/music";

import { api, apiEnv, respondCached } from "../_api";

export const GET = defineHandler<MusicSnapshot>((c) =>
  respondCached(c, () => api.music(apiEnv(c))),
);
