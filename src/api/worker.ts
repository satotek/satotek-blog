import { createApp } from "./app";
import type { Ga4Env } from "./ga4";

const app = createApp();

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
  props: unknown;
};

export default {
  fetch(request: Request, env: Ga4Env, executionCtx: WorkerContext) {
    return app.fetch(request, env, executionCtx);
  },
};
