import { Hono } from "hono";

import type { PopularPost } from "../analytics/types";
import {
  DEFAULT_POST_LIMIT,
  findPublishedPost,
  listPublishedPosts,
  normalizeLimit,
  rankPublishedPosts,
  searchPublishedPosts,
  taxonomyForPosts,
} from "../lib/posts/query";
import type { PostSummary } from "../lib/posts/types";
import summaries from "../content/.generated/summaries.json";
import { getPopularPostsFromGa4, type Ga4Env } from "./ga4";

const POPULAR_CACHE_SECONDS = 60 * 60;
const POPULAR_FAILURE_CACHE_SECONDS = 60;

const publishedSummaries = summaries as readonly PostSummary[];

type ApiOptions = {
  posts?: readonly PostSummary[];
  loadPopularPosts?: (env: Ga4Env) => Promise<readonly PopularPost[]>;
};

type ApiContext = {
  Bindings: Ga4Env;
};

function queryValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function limitFromQuery(value: string | undefined) {
  if (value === undefined || value.trim() === "") return DEFAULT_POST_LIMIT;
  if (!/^[0-9]+$/.test(value)) {
    throw new Error(`limit must be an integer from 1 to ${DEFAULT_POST_LIMIT}.`);
  }
  return normalizeLimit(Number(value));
}

type CacheContext = {
  waitUntil(promise: Promise<unknown>): void;
};

function executionContext(c: { executionCtx: CacheContext }): CacheContext | undefined {
  try {
    const value: unknown = c.executionCtx;
    if (typeof value === "object" && value !== null && "waitUntil" in value) {
      return value as CacheContext;
    }
  } catch {
    // 開発サーバーとテストには Worker の実行コンテキストが無い。
  }
  return undefined;
}

function workerCache() {
  const caches = globalThis.caches as (CacheStorage & { default?: Cache }) | undefined;
  return caches?.default;
}

async function cachedResponse(
  request: Request,
  executionCtx: CacheContext | undefined,
  seconds: number,
  response: Response,
) {
  response.headers.set("cache-control", `public, max-age=${seconds}`);
  const cache = workerCache();
  if (!cache) return response;

  executionCtx?.waitUntil(cache.put(new Request(request.url, { method: "GET" }), response.clone()));
  return response;
}

export function createApp(options: ApiOptions = {}) {
  const posts = options.posts ?? publishedSummaries;
  const loadPopularPosts = options.loadPopularPosts ?? getPopularPostsFromGa4;
  const app = new Hono<ApiContext>();

  app.onError((error, c) => {
    if (error instanceof Error && /must be/.test(error.message)) {
      return c.json({ error: error.message }, 400);
    }
    console.error("[api]", error instanceof Error ? error.message : error);
    return c.json({ error: "internal error" }, 500);
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.get("/api/posts", (c) => {
    const category = queryValue(c.req.query("category"));
    const tag = queryValue(c.req.query("tag"));
    const limit = limitFromQuery(c.req.query("limit"));
    return c.json(listPublishedPosts(posts, { category, tag }, limit));
  });

  app.get("/api/posts/popular", async (c) => {
    const cache = workerCache();
    if (cache) {
      const hit = await cache.match(new Request(c.req.url, { method: "GET" }));
      if (hit) return hit;
    }

    const popular = await loadPopularPosts(c.env);
    const ranked = rankPublishedPosts(popular, posts);
    const available = ranked.length > 0;
    const response = c.json(
      {
        range: "7d",
        source: available ? "ga4" : "unavailable",
        posts: ranked,
      },
      200,
    );
    return cachedResponse(
      c.req.raw,
      executionContext(c),
      available ? POPULAR_CACHE_SECONDS : POPULAR_FAILURE_CACHE_SECONDS,
      response,
    );
  });

  app.get("/api/posts/:slug", (c) => {
    const post = findPublishedPost(posts, c.req.param("slug"));
    if (!post) return c.json({ error: "not found" }, 404);
    return c.json(post);
  });

  app.get("/api/search", (c) => {
    const query = c.req.query("q") ?? "";
    const limit = limitFromQuery(c.req.query("limit"));
    return c.json({ query, ...searchPublishedPosts(posts, query, limit) });
  });

  app.get("/api/taxonomy", (c) => c.json(taxonomyForPosts(posts)));

  return app;
}
