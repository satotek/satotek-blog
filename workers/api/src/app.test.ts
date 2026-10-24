import { describe, expect, it } from "vite-plus/test";

import type { PopularPost } from "#/analytics/types";
import type { MusicSnapshot } from "#/lib/music";
import type { PostSummary } from "#/lib/posts/types";

import { createApp } from "./app";

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

function app() {
  return createApp({
    posts,
    loadPopularPosts: async () => popular,
    loadMusic: async () => music,
  });
}

function request(appInstance: ReturnType<typeof createApp>, path: string) {
  return appInstance.handle(new Request(`http://localhost${path}`));
}

describe("blog API", () => {
  it("reports health", async () => {
    const response = await request(app(), "/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("lists and filters published posts", async () => {
    const response = await request(app(), "/api/posts?category=技術&limit=10");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.posts.map((post: { slug: string }) => post.slug)).toEqual(["nix-flakes-dotfiles"]);
    expect(body.posts[0]?.url).toBe("https://satotek.dev/posts/nix-flakes-dotfiles");
  });

  it("returns one post and 404 for an unknown slug", async () => {
    const found = await request(app(), "/api/posts/first-post");
    const missing = await request(app(), "/api/posts/missing");

    expect(found.status).toBe(200);
    expect(await found.json()).toMatchObject({ slug: "first-post", category: "日常" });
    expect(missing.status).toBe(404);
  });

  it("searches metadata", async () => {
    const response = await request(app(), "/api/search?q=Nix");
    const body = await response.json();

    expect(body.total).toBe(1);
    expect(body.posts[0]?.slug).toBe("nix-flakes-dotfiles");
  });

  it("rejects an empty search", async () => {
    const response = await request(app(), "/api/search?q=");
    expect(response.status).toBe(400);
  });

  it("returns taxonomy counts", async () => {
    const response = await request(app(), "/api/taxonomy");
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
    const response = await request(app(), "/api/posts/popular");
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
    const response = await request(
      createApp({
        posts,
        loadPopularPosts: async () => [],
      }),
      "/api/posts/popular",
    );

    expect(await response.json()).toMatchObject({ source: "unavailable", posts: [] });
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("returns a listening snapshot without the Last.fm key", async () => {
    const response = await request(app(), "/api/music");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(music);
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("caches an unavailable listening snapshot briefly", async () => {
    const response = await request(
      createApp({
        posts,
        loadPopularPosts: async () => popular,
        loadMusic: async () => {
          throw new Error("LASTFM_API_KEY=secret-key");
        },
      }),
      "/api/music",
    );
    const body = await response.json();

    expect(body).toMatchObject({ source: "unavailable", recent: [], nowPlaying: null });
    expect(JSON.stringify(body)).not.toContain("secret-key");
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
  });
});
