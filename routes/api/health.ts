import { defineHandler } from "void";

import { api, respond } from "../_api";

export const GET = defineHandler(() => respond(api.health));
