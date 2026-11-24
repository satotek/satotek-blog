import { defineHandler } from "void";

import { api, respond } from "../_api";

export const GET = defineHandler((c) => respond(() => api.search(c.req.query())));
