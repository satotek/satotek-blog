import { defineHandler } from "void";

import { api, respond } from "../../_api";

export const GET = defineHandler((c) => respond(() => api.listPosts(c.req.query())));
