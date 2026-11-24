import type { PopularPost } from "#/core/analytics/types";
import { unavailableGithub, type GithubSnapshot } from "#/core/github";
import { unavailableMusic, type MusicSnapshot } from "#/core/music";
import {
  DEFAULT_POST_LIMIT,
  findPublishedPost,
  listPublishedPosts,
  normalizeLimit,
  rankPublishedPosts,
  searchPublishedPosts,
  taxonomyForPosts,
} from "#/core/posts/query";
import type { PostSummary } from "#/core/posts/types";

import type { ApiEnv } from "./env";
import { getPopularPostsFromGa4, getPostViewsFromGa4 } from "./ga4";
import { getGithubActivity } from "./github";
import { getMusicFromLastfm } from "./lastfm";

const POPULAR_CACHE_SECONDS = 60 * 60;
const POPULAR_FAILURE_CACHE_SECONDS = 60;
const POST_VIEWS_CACHE_SECONDS = 60 * 60;
const POST_VIEWS_FAILURE_CACHE_SECONDS = 60;
const MUSIC_CACHE_SECONDS = 60;
const MUSIC_FAILURE_CACHE_SECONDS = 60;
const GITHUB_CACHE_SECONDS = 10 * 60;
const GITHUB_FAILURE_CACHE_SECONDS = 60;

/**
 * ルートが返す結果。status を省いたら 200。maxAge があればエッジにキャッシュする。
 * HTTP の組み立て（キャッシュ・ヘッダー・エラー変換）はルート側（routes/_api.ts）が持ち、
 * ここは Hono にも Worker にも依存しない純粋な処理だけにしてテストしやすくする。
 */
export type ApiResult = { status?: number; body: unknown; maxAge?: number };

export type ApiDeps = {
  posts: readonly PostSummary[];
  loadPopularPosts: (env: ApiEnv) => Promise<readonly PopularPost[]>;
  loadPostViews: (env: ApiEnv) => Promise<ReadonlyMap<string, number> | undefined>;
  loadMusic: (env: ApiEnv) => Promise<MusicSnapshot>;
  loadGithub: (env: ApiEnv) => Promise<GithubSnapshot>;
};

type Query = Record<string, string | undefined>;

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

const notFound: ApiResult = { status: 404, body: { error: "not found" } };

/**
 * 入力が不正なとき、検索・一覧の処理は「〜 must be 〜」という Error を投げる。
 * ルート側はこの形を 400 に、それ以外を 500 にする。
 */
export function isBadRequest(error: unknown) {
  return error instanceof Error && /must be/.test(error.message);
}

export function createApi(deps: Partial<ApiDeps> & Pick<ApiDeps, "posts">) {
  const {
    posts,
    loadPopularPosts = getPopularPostsFromGa4,
    loadPostViews = getPostViewsFromGa4,
    loadMusic = getMusicFromLastfm,
    loadGithub = getGithubActivity,
  } = deps;

  return {
    health: (): ApiResult => ({ body: { ok: true } }),

    listPosts: (query: Query): ApiResult => ({
      body: listPublishedPosts(
        posts,
        { category: queryValue(query.category), tag: queryValue(query.tag) },
        limitFromQuery(query.limit),
      ),
    }),

    post: (slug: string): ApiResult => {
      const post = findPublishedPost(posts, slug);
      return post ? { body: post } : notFound;
    },

    search: (query: Query): ApiResult => {
      const q = query.q ?? "";
      return { body: { query: q, ...searchPublishedPosts(posts, q, limitFromQuery(query.limit)) } };
    },

    taxonomy: (): ApiResult => ({ body: taxonomyForPosts(posts) }),

    popular: async (env: ApiEnv): Promise<ApiResult> => {
      const ranked = rankPublishedPosts(await loadPopularPosts(env), posts);
      const available = ranked.length > 0;
      return {
        body: { range: "7d", source: available ? "ga4" : "unavailable", posts: ranked },
        maxAge: available ? POPULAR_CACHE_SECONDS : POPULAR_FAILURE_CACHE_SECONDS,
      };
    },

    /** 記事の有無はキャッシュより先に確かめる。存在しない slug でキャッシュを埋めないため。 */
    postExists: (slug: string) => findPublishedPost(posts, slug) !== undefined,

    postViews: async (slug: string, env: ApiEnv): Promise<ApiResult> => {
      if (!findPublishedPost(posts, slug)) return notFound;
      const views = await loadPostViews(env);
      const available = views !== undefined;
      return {
        body: {
          slug,
          range: "all",
          source: available ? "ga4" : "unavailable",
          views: available ? (views.get(slug) ?? 0) : null,
        },
        maxAge: available ? POST_VIEWS_CACHE_SECONDS : POST_VIEWS_FAILURE_CACHE_SECONDS,
      };
    },

    music: async (env: ApiEnv): Promise<ApiResult> => {
      let snapshot: MusicSnapshot;
      try {
        snapshot = await loadMusic(env);
      } catch {
        // 例外の文面には API キーが混ざり得るので、ログにも応答にも出さない。
        console.error("[api] music request failed");
        snapshot = unavailableMusic();
      }
      return {
        body: snapshot,
        maxAge: snapshot.source === "lastfm" ? MUSIC_CACHE_SECONDS : MUSIC_FAILURE_CACHE_SECONDS,
      };
    },

    github: async (env: ApiEnv): Promise<ApiResult> => {
      let snapshot: GithubSnapshot;
      try {
        snapshot = await loadGithub(env);
      } catch {
        console.error("[api] github request failed");
        snapshot = unavailableGithub();
      }
      return {
        body: snapshot,
        maxAge: snapshot.source === "github" ? GITHUB_CACHE_SECONDS : GITHUB_FAILURE_CACHE_SECONDS,
      };
    },
  };
}

export type Api = ReturnType<typeof createApi>;
