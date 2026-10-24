import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

import { createApp } from "./app";
import type { ApiEnv } from "./env";
import { runWithRequestState } from "./request-context";

const ENV_KEYS = [
  "GA4_PROPERTY_ID",
  "GA4_CLIENT_EMAIL",
  "GA4_PRIVATE_KEY",
  "LASTFM_API_KEY",
  "LASTFM_USERNAME",
] as const satisfies readonly (keyof ApiEnv)[];

const app = createApp();

function readEnvFile(path: string, env: ApiEnv) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!ENV_KEYS.includes(key as (typeof ENV_KEYS)[number])) continue;
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    const envKey = key as (typeof ENV_KEYS)[number];
    if (!env[envKey]) env[envKey] = value;
  }
}

function apiEnv(): ApiEnv {
  const env: ApiEnv = {};
  for (const key of ENV_KEYS) env[key] = process.env[key];
  readEnvFile(".env.local", env);
  readEnvFile(".dev.vars", env);
  return env;
}

const env = apiEnv();

export async function handleApiDevRequest(
  req: IncomingMessage,
  res: ServerResponse,
  next: (error?: unknown) => void,
) {
  const url = req.url ?? "/";
  if (!url.startsWith("/api")) {
    next();
    return;
  }

  try {
    const host = req.headers.host ?? "localhost";
    const response = await runWithRequestState({ env }, () =>
      app.handle(new Request(`http://${host}${url}`, { method: req.method })),
    );
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    next(error);
  }
}
