import { AsyncLocalStorage } from "node:async_hooks";

import type { ApiEnv } from "./env";

type RequestState = {
  env: ApiEnv;
  waitUntil?: (promise: Promise<unknown>) => void;
};

const storage = new AsyncLocalStorage<RequestState>();

export function runWithRequestState<T>(state: RequestState, run: () => T) {
  return storage.run(state, run);
}

export function currentRequestState(): RequestState {
  return storage.getStore() ?? { env: {} };
}
