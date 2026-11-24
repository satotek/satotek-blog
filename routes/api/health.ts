import { defineHandler } from "void";

import { api, respond } from "../_api";

export const GET = defineHandler<{ ok: true }>(() => respond(api.health));
