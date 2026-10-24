import type { Ga4Env } from "./ga4";
import type { GithubEnv } from "./github";
import type { LastfmEnv } from "./lastfm";

export type ApiEnv = Ga4Env & LastfmEnv & GithubEnv;
