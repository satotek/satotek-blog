import { describe, expect, it } from "vite-plus/test";

import type { PopularPost } from "#/core/analytics/types";
import type { MusicSnapshot } from "#/core/music";
import type { PostSummary } from "#/core/posts/types";

import { respond } from "../../../routes/_api";
import { createApi, type ApiResult } from "./service";

const posts: readonly PostSummary[] = [
  {
    slug: "nix-flakes-dotfiles",
    readingMinutes: 3,
    title: "dotfiles を Nix Flakes で管理している話",
    date: "2026-07-04",
    category: "tech",
    description: "Nix Flakes と Home Manager の運用記録。",
    tags: ["Nix"],
  },
  {
    slug: "first-post",
    readingMinutes: 3,
    title: "はじめまして",
    date: "2026-06-07",
    category: "daily",
    description: "自己紹介。",
    tags: ["雑記"],
  },
];

const popular: readonly PopularPost[] = [
  { slug: "missing", title: "存在しない", path: "/posts/missing", views: 20 },
  { slug: "first-post", title: "GAのタイトル", path: "/posts/first-post", views: 9 },
  {
    slug: "nix-flakes-dotfiles",
    title: "GAのタイトル",
    path: "/posts/nix-flakes-dotfiles",
    views: 4,
  },
];

const music: MusicSnapshot = {
  source: "lastfm",
  user: "nosuke",
  profileUrl: "https://www.last.fm/user/nosuke",
  range: "7d",
  playcount: 12,
  scrobbles: 900,
  nowPlaying: {
    name: "ナイトクルージング",
    artist: "Fishmans",
    album: "空中キャンプ",
    url: "https://www.last.fm/music/Fishmans/_/Night",
    image: null,
    playedAt: null,
  },
  recent: [],
  topArtists: [],
  topTracks: [],
};

function api() {
  return createApi({
    posts,
    loadPopularPosts: async () => popular,
    loadPostViews: async () => new Map([["first-post", 128]]),
    loadMusic: async () => music,
  });
}

const env = {};

/** ルートと同じ respond() を通して、ステータスと Cache-Control まで確かめる。 */
async function send(run: () => ApiResult | Promise<ApiResult>) {
  return respond(run);
}

describe("blog API", () => {
  it("reports health", async () => {
    const response = await send(api().health);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("lists and filters published posts", async () => {
    const response = await send(() => api().listPosts({ category: "技術", limit: "10" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.posts.map((post: { slug: string }) => post.slug)).toEqual(["nix-flakes-dotfiles"]);
    expect(body.posts[0]?.url).toBe("https://satotek.dev/posts/nix-flakes-dotfiles");
  });

  it("rejects a malformed limit", async () => {
    const response = await send(() => api().listPosts({ limit: "abc" }));
    expect(response.status).toBe(400);
  });

  it("returns one post and 404 for an unknown slug", async () => {
    const found = await send(() => api().post("first-post"));
    const missing = await send(() => api().post("missing"));

    expect(found.status).toBe(200);
    expect(await found.json()).toMatchObject({ slug: "first-post", category: "日常" });
    expect(missing.status).toBe(404);
  });

  it("returns a post's all-time views", async () => {
    const counted = await send(() => api().postViews("first-post", env));
    const uncounted = await send(() => api().postViews("nix-flakes-dotfiles", env));
    const missing = await send(() => api().postViews("missing", env));

    expect(await counted.json()).toEqual({
      slug: "first-post",
      range: "all",
      source: "ga4",
      views: 128,
    });
    expect(await uncounted.json()).toMatchObject({ source: "ga4", views: 0 });
    expect(missing.status).toBe(404);
    expect(api().postExists("missing")).toBe(false);
  });

  it("reports views as unavailable when GA4 cannot answer", async () => {
    const response = await send(() =>
      createApi({ posts, loadPostViews: async () => undefined }).postViews("first-post", env),
    );

    expect(await response.json()).toMatchObject({ source: "unavailable", views: null });
  });

  it("returns GitHub activity and survives a failed request", async () => {
    const snapshot = {
      source: "github" as const,
      user: "satotek",
      profileUrl: "https://github.com/satotek",
      activity: [],
    };
    const ok = await send(() => createApi({ posts, loadGithub: async () => snapshot }).github(env));
    const failed = await send(() =>
      createApi({
        posts,
        loadGithub: async () => {
          throw new Error("rate limited");
        },
      }).github(env),
    );

    expect(await ok.json()).toEqual(snapshot);
    expect(failed.status).toBe(200);
    expect(await failed.json()).toMatchObject({ source: "unavailable", activity: [] });
  });

  it("searches metadata", async () => {
    const response = await send(() => api().search({ q: "Nix" }));
    const body = await response.json();

    expect(body.total).toBe(1);
    expect(body.posts[0]?.slug).toBe("nix-flakes-dotfiles");
  });

  it("rejects an empty search", async () => {
    const response = await send(() => api().search({ q: "" }));
    expect(response.status).toBe(400);
  });

  it("returns taxonomy counts", async () => {
    const response = await send(api().taxonomy);
    const body = await response.json();

    expect(
      body.categories.find((category: { slug: string }) => category.slug === "tech"),
    ).toMatchObject({
      name: "技術",
      count: 1,
    });
    expect(body.tags).toEqual(
      expect.arrayContaining([
        { name: "Nix", count: 1 },
        { name: "雑記", count: 1 },
      ]),
    );
  });

  it("ranks published posts without view counts", async () => {
    const response = await send(() => api().popular(env));
    const body = await response.json();

    expect(body).toEqual({
      range: "7d",
      source: "ga4",
      posts: [
        expect.objectContaining({ rank: 1, slug: "first-post", title: "はじめまして" }),
        expect.objectContaining({ rank: 2, slug: "nix-flakes-dotfiles" }),
      ],
    });
    expect(JSON.stringify(body)).not.toContain("views");
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("caches an empty ranking briefly when analytics is unavailable", async () => {
    const response = await send(() =>
      createApi({ posts, loadPopularPosts: async () => [] }).popular(env),
    );

    expect(await response.json()).toMatchObject({ source: "unavailable", posts: [] });
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("returns a listening snapshot without the Last.fm key", async () => {
    const response = await send(() => api().music(env));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(music);
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("caches an unavailable listening snapshot briefly", async () => {
    const response = await send(() =>
      createApi({
        posts,
        loadMusic: async () => {
          throw new Error("LASTFM_API_KEY=secret-key");
        },
      }).music(env),
    );
    const body = await response.json();

    expect(body).toMatchObject({ source: "unavailable", recent: [], nowPlaying: null });
    expect(JSON.stringify(body)).not.toContain("secret-key");
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("hides internal errors behind a generic 500", async () => {
    const response = await send(() => {
      throw new Error("database password is hunter2");
    });

    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("hunter2");
  });
});
