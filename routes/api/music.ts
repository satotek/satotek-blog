import { defineHandler } from "void";

import { api, apiEnv, respondCached } from "../_api";

export const GET = defineHandler((c) => respondCached(c, () => api.music(apiEnv(c))));
