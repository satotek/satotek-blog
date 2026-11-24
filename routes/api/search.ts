import { defineHandler } from "void";

import type { PostSearchResult } from "#/core/posts/query";

import { api, respond } from "../_api";

export const GET = defineHandler<PostSearchResult>((c) => respond(() => api.search(c.req.query())));
