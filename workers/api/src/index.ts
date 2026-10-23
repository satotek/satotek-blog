import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { createApp } from "./app";
import type { Ga4Env } from "./ga4";
import { runWithRequestState } from "./request-context";

const app = createApp({ adapter: CloudflareAdapter }).compile();

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
};

export default {
  fetch(request: Request, env: Ga4Env, executionCtx: WorkerContext) {
    return runWithRequestState({ env, waitUntil: executionCtx.waitUntil.bind(executionCtx) }, () =>
      app.handle(request),
    );
  },
};
