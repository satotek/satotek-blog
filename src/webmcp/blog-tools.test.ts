import { describe, expect, it } from "vite-plus/test";

import type { PostSummary } from "@satotek/blog-core/posts/types";

import { createApp } from "../../workers/api/src/app";
import { createBlogWebMcpTools } from "./blog-tools";

const posts: readonly PostSummary[] = [
  {
    slug: "nix-flakes-dotfiles",
    readingMinutes: 3,
    title: "dotfiles を Nix Flakes で管理している話",
    date: "2026-07-04",
    category: "tech",
    description: "Nix Flakes と Home Manager の運用記録。",
    tags: ["Nix", "Home Manager", "Claude Code"],
  },
  {
    slug: "cloudflare-workers-site",
    readingMinutes: 3,
    title: "Cloudflare Workers でサイトを作ってみた",
    date: "2026-06-07",
    category: "tech",
    description: "Cloudflare Workers と Hono でサイトを構築した話。",
    tags: ["Cloudflare", "Workers", "Hono"],
  },
  {
    slug: "first-post",
    readingMinutes: 3,
    title: "はじめまして",
    date: "2026-06-07",
    category: "daily",
    description: "自己紹介とサイトを作った経緯。",
    tags: ["雑記"],
  },
];

const api = createApp({ posts });
const requested: string[] = [];

function fetchApi(path: string) {
  requested.push(path);
  return api.handle(new Request(`http://localhost${path}`));
}

function toolNamed(name: string, options: Parameters<typeof createBlogWebMcpTools>[0] = {}) {
  const tool = createBlogWebMcpTools({ fetchApi, ...options }).find(
    (candidate) => candidate.name === name,
  );
  if (!tool) throw new Error(`Missing tool: ${name}`);
  return tool;
}

// The browser always passes an execution context, so mirror that in tests.
const executeOptions = { signal: new AbortController().signal };

describe("blog WebMCP tools", () => {
  it("searches through the API", async () => {
    const result = await toolNamed("search_posts").execute(
      { query: "cloudflare", limit: 5 },
      executeOptions,
    );

    expect(requested.at(-1)).toBe("/api/search?q=cloudflare&limit=5");
    expect(result).toMatchObject({
      query: "cloudflare",
      total: 1,
      posts: [{ slug: "cloudflare-workers-site" }],
    });
  });

  it("lists by Japanese category labels and case-insensitive tags", async () => {
    const list = toolNamed("list_posts");
    const categoryResult = (await list.execute({ category: "技術" }, executeOptions)) as {
      posts: { slug: string }[];
    };
    const tagResult = (await list.execute({ tag: "nIx" }, executeOptions)) as {
      filters: unknown;
      posts: { slug: string }[];
    };

    expect(categoryResult.posts.map((post) => post.slug)).toEqual([
      "nix-flakes-dotfiles",
      "cloudflare-workers-site",
    ]);
    expect(tagResult.filters).toEqual({ category: null, tag: "nIx" });
    expect(tagResult.posts.map((post) => post.slug)).toEqual(["nix-flakes-dotfiles"]);
  });

  it("returns concise metadata and opens only published slugs", async () => {
    const opened: string[] = [];
    const search = toolNamed("search_posts");
    const open = toolNamed("open_post", {
      openPost: (post) => {
        opened.push(post.slug);
      },
    });

    const searchResult = await search.execute({ query: "Nix" }, executeOptions);
    await open.execute({ slug: "nix-flakes-dotfiles" }, executeOptions);

    expect(searchResult).toMatchObject({
      query: "Nix",
      total: 1,
      posts: [{ slug: "nix-flakes-dotfiles", category: "技術" }],
    });
    expect(JSON.stringify(searchResult).length).toBeLessThan(1500);
    expect(opened).toEqual(["nix-flakes-dotfiles"]);
    await expect(open.execute({ slug: "missing-post" }, executeOptions)).rejects.toThrow(
      "Search for an article first",
    );
  });

  it("passes the API's validation message through", async () => {
    await expect(
      toolNamed("search_posts").execute({ query: "   " }, executeOptions),
    ).rejects.toThrow("query must be a non-empty string.");
  });
});
