import { existsSync, readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";

import { createApp } from "./app";
import type { Ga4Env } from "./ga4";
import { runWithRequestState } from "./request-context";

const app = createApp();

function readEnvFile(path: string, env: Ga4Env) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (key !== "GA4_PROPERTY_ID" && key !== "GA4_CLIENT_EMAIL" && key !== "GA4_PRIVATE_KEY") {
      continue;
    }
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!env[key]) env[key] = value;
  }
}

function ga4Env(): Ga4Env {
  const env: Ga4Env = {
    GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID,
    GA4_CLIENT_EMAIL: process.env.GA4_CLIENT_EMAIL,
    GA4_PRIVATE_KEY: process.env.GA4_PRIVATE_KEY,
  };
  readEnvFile(".env.local", env);
  readEnvFile(".dev.vars", env);
  return env;
}

const env = ga4Env();

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
