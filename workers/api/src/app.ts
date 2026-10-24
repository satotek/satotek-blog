import { Elysia, type ElysiaAdapter } from "elysia";

import type { PopularPost } from "../../../src/analytics/types";
import summaries from "../../../src/content/.generated/summaries.json";
import {
  DEFAULT_POST_LIMIT,
  findPublishedPost,
  listPublishedPosts,
  normalizeLimit,
  rankPublishedPosts,
  searchPublishedPosts,
  taxonomyForPosts,
} from "../../../src/lib/posts/query";
import type { PostSummary } from "../../../src/lib/posts/types";
import type { ApiEnv } from "./env";
import { getPopularPostsFromGa4, getPostViewsFromGa4 } from "./ga4";
import { getGithubActivity } from "./github";
import { getMusicFromLastfm } from "./lastfm";
import { unavailableGithub, type GithubSnapshot } from "../../../src/lib/github";
import { unavailableMusic, type MusicSnapshot } from "../../../src/lib/music";
import { currentRequestState } from "./request-context";

const POPULAR_CACHE_SECONDS = 60 * 60;
const POPULAR_FAILURE_CACHE_SECONDS = 60;
const POST_VIEWS_CACHE_SECONDS = 60 * 60;
const POST_VIEWS_FAILURE_CACHE_SECONDS = 60;
const MUSIC_CACHE_SECONDS = 60;
const MUSIC_FAILURE_CACHE_SECONDS = 60;
const GITHUB_CACHE_SECONDS = 10 * 60;
const GITHUB_FAILURE_CACHE_SECONDS = 60;

const publishedSummaries = summaries as readonly PostSummary[];

type ApiOptions = {
  posts?: readonly PostSummary[];
  loadPopularPosts?: (env: ApiEnv) => Promise<readonly PopularPost[]>;
  loadPostViews?: (env: ApiEnv) => Promise<ReadonlyMap<string, number> | undefined>;
  loadMusic?: (env: ApiEnv) => Promise<MusicSnapshot>;
  loadGithub?: (env: ApiEnv) => Promise<GithubSnapshot>;
  adapter?: ElysiaAdapter;
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

function workerCache() {
  const caches = globalThis.caches as (CacheStorage & { default?: Cache }) | undefined;
  return caches?.default;
}

async function cachedResponse(request: Request, seconds: number, response: Response) {
  response.headers.set("cache-control", `public, max-age=${seconds}`);
  const cache = workerCache();
  const waitUntil = currentRequestState().waitUntil;
  if (cache && waitUntil) {
    waitUntil(cache.put(new Request(request.url, { method: "GET" }), response.clone()));
  }
  return response;
}

export function createApp(options: ApiOptions = {}) {
  const posts = options.posts ?? publishedSummaries;
  const loadPopularPosts = options.loadPopularPosts ?? getPopularPostsFromGa4;
  const loadPostViews = options.loadPostViews ?? getPostViewsFromGa4;
  const loadMusic = options.loadMusic ?? getMusicFromLastfm;
  const loadGithub = options.loadGithub ?? getGithubActivity;

  return new Elysia({ adapter: options.adapter })
    .onError(({ error, set }) => {
      const message = error instanceof Error ? error.message : "";
      if (/must be/.test(message)) {
        set.status = 400;
        return { error: message };
      }
      console.error("[api]", message || error);
      set.status = 500;
      return { error: "internal error" };
    })
    .get("/api/health", () => ({ ok: true }))
    .get("/api/posts", ({ query }) => {
      const category = queryValue(typeof query.category === "string" ? query.category : undefined);
      const tag = queryValue(typeof query.tag === "string" ? query.tag : undefined);
      const limit = limitFromQuery(typeof query.limit === "string" ? query.limit : undefined);
      return listPublishedPosts(posts, { category, tag }, limit);
    })
    .get("/api/posts/popular", async ({ request }) => {
      const cache = workerCache();
      if (cache) {
        const hit = await cache.match(new Request(request.url, { method: "GET" }));
        if (hit) return hit;
      }

      const popular = await loadPopularPosts(currentRequestState().env);
      const ranked = rankPublishedPosts(popular, posts);
      const available = ranked.length > 0;
      return cachedResponse(
        request,
        available ? POPULAR_CACHE_SECONDS : POPULAR_FAILURE_CACHE_SECONDS,
        Response.json({
          range: "7d",
          source: available ? "ga4" : "unavailable",
          posts: ranked,
        }),
      );
    })
    .get("/api/music", async ({ request }) => {
      const cache = workerCache();
      if (cache) {
        const hit = await cache.match(new Request(request.url, { method: "GET" }));
        if (hit) return hit;
      }

      let snapshot: MusicSnapshot;
      try {
        snapshot = await loadMusic(currentRequestState().env);
      } catch {
        console.error("[api] music request failed");
        snapshot = unavailableMusic();
      }
      const available = snapshot.source === "lastfm";
      return cachedResponse(
        request,
        available ? MUSIC_CACHE_SECONDS : MUSIC_FAILURE_CACHE_SECONDS,
        Response.json(snapshot),
      );
    })
    .get("/api/github", async ({ request }) => {
      const cache = workerCache();
      if (cache) {
        const hit = await cache.match(new Request(request.url, { method: "GET" }));
        if (hit) return hit;
      }

      let snapshot: GithubSnapshot;
      try {
        snapshot = await loadGithub(currentRequestState().env);
      } catch {
        console.error("[api] github request failed");
        snapshot = unavailableGithub();
      }
      const available = snapshot.source === "github";
      return cachedResponse(
        request,
        available ? GITHUB_CACHE_SECONDS : GITHUB_FAILURE_CACHE_SECONDS,
        Response.json(snapshot),
      );
    })
    .get("/api/posts/:slug/views", async ({ params, request, set }) => {
      const slug = typeof params.slug === "string" ? params.slug : "";
      if (!findPublishedPost(posts, slug)) {
        set.status = 404;
        return { error: "not found" };
      }

      const cache = workerCache();
      if (cache) {
        const hit = await cache.match(new Request(request.url, { method: "GET" }));
        if (hit) return hit;
      }

      const views = await loadPostViews(currentRequestState().env);
      const available = views !== undefined;
      return cachedResponse(
        request,
        available ? POST_VIEWS_CACHE_SECONDS : POST_VIEWS_FAILURE_CACHE_SECONDS,
        Response.json({
          slug,
          range: "all",
          source: available ? "ga4" : "unavailable",
          views: available ? (views.get(slug) ?? 0) : null,
        }),
      );
    })
    .get("/api/posts/:slug", ({ params, set }) => {
      const slug = typeof params.slug === "string" ? params.slug : "";
      const post = findPublishedPost(posts, slug);
      if (!post) {
        set.status = 404;
        return { error: "not found" };
      }
      return post;
    })
    .get("/api/search", ({ query }) => {
      const q = typeof query.q === "string" ? query.q : "";
      const limit = limitFromQuery(typeof query.limit === "string" ? query.limit : undefined);
      return { query: q, ...searchPublishedPosts(posts, q, limit) };
    })
    .get("/api/taxonomy", () => taxonomyForPosts(posts));
}
