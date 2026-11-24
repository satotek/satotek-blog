import type { PostSummary } from "#/core/posts/types";
import type { Context } from "hono";

import summaries from "../src/content/.generated/summaries.json";
import type { ApiEnv } from "../src/server/api/env";
import { createApi, isBadRequest, type ApiResult } from "../src/server/api/service";

export const api = createApi({ posts: summaries as readonly PostSummary[] });

/**
 * Worker のシークレットは c.env に入る。void/env（env.ts）で型を付けると、Void の生成する
 * .void/env.d.ts 経由で Workers の型がブラウザ側のコードにまで入り、DOM の型とぶつかる。
 * 取得処理はどの値も任意として扱うので、ApiEnv として受け取る。
 */
export function apiEnv(c: Context): ApiEnv {
  return (c.env ?? {}) as ApiEnv;
}

function toResponse({ status = 200, body, maxAge }: ApiResult) {
  const response = Response.json(body, { status });
  if (maxAge !== undefined) response.headers.set("cache-control", `public, max-age=${maxAge}`);
  return response;
}

/** 入力の誤りは 400、それ以外は 500。中身を伏せて返し、詳細はログにだけ残す。 */
function errorResponse(error: unknown) {
  if (isBadRequest(error)) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
  console.error("[api]", error instanceof Error ? error.message : error);
  return Response.json({ error: "internal error" }, { status: 500 });
}

export async function respond(run: () => ApiResult | Promise<ApiResult>) {
  try {
    return toResponse(await run());
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * 外部 API を叩くルート用。Worker のキャッシュにあればそれを返し、無ければ作って置く。
 * キャッシュへの書き込みは応答を待たせないよう waitUntil に回す。
 */
export async function respondCached(c: Context, run: () => Promise<ApiResult>) {
  // caches.default は Workers 固有。ブラウザ側と同じ tsconfig で検査するので、ここで型を足す。
  const cache = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches?.default;
  const key = new Request(c.req.url, { method: "GET" });
  const hit = await cache?.match(key);
  if (hit) return hit;

  const response = await respond(run);
  if (cache && response.ok) {
    try {
      c.executionCtx.waitUntil(cache.put(key, response.clone()));
    } catch {
      // 開発サーバーなど executionCtx が無い環境では、キャッシュせずに返す。
    }
  }
  return response;
}
