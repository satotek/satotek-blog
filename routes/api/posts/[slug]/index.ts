import { defineHandler } from "void";

import { api, respond } from "../../../_api";

export const GET = defineHandler((c) => respond(() => api.post(c.req.param("slug") ?? "")));
