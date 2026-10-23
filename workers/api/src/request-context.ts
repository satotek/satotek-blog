import { AsyncLocalStorage } from "node:async_hooks";

import type { Ga4Env } from "./ga4";

type RequestState = {
  env: Ga4Env;
  waitUntil?: (promise: Promise<unknown>) => void;
};

const storage = new AsyncLocalStorage<RequestState>();

export function runWithRequestState<T>(state: RequestState, run: () => T) {
  return storage.run(state, run);
}

export function currentRequestState(): RequestState {
  return storage.getStore() ?? { env: {} };
}
