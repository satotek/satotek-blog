import { defineHandler } from "void";

import type { PublicPost } from "#/core/posts/query";

import { api, respond } from "../../../_api";

export const GET = defineHandler<PublicPost>((c) =>
  respond(() => api.post(c.req.param("slug") ?? "")),
);
