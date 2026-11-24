import { defineHandler } from "void";

import type { TaxonomyResult } from "#/core/posts/query";

import { api, respond } from "../_api";

export const GET = defineHandler<TaxonomyResult>(() => respond(api.taxonomy));
