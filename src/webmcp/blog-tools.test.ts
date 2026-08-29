import { describe, expect, it } from "vite-plus/test";

import type { PostSummary } from "#/content/types";

import { createBlogWebMcpTools, listPostSummaries, searchPostSummaries } from "./blog-tools";

const posts: readonly PostSummary[] = [
  {
    slug: "nix-flakes-dotfiles",
    title: "dotfiles を Nix Flakes で管理している話",
    date: "2026-07-04",
    category: "tech",
    description: "Nix Flakes と Home Manager の運用記録。",
    tags: ["Nix", "Home Manager", "Claude Code"],
  },
  {
    slug: "cloudflare-workers-site",
    title: "Cloudflare Workers でサイトを作ってみた",
    date: "2026-06-07",
    category: "tech",
    description: "Cloudflare Workers と Hono でサイトを構築した話。",
    tags: ["Cloudflare", "Workers", "Hono"],
  },
  {
    slug: "first-post",
    title: "はじめまして",
    date: "2026-06-07",
    category: "daily",
    description: "自己紹介とサイトを作った経緯。",
    tags: ["雑記"],
  },
];

function toolNamed(name: string, options?: Parameters<typeof createBlogWebMcpTools>[0]) {
  const tool = createBlogWebMcpTools(options).find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Missing tool: ${name}`);
  return tool;
}

// The browser always passes an execution context, so mirror that in tests.
const executeOptions = { signal: new AbortController().signal };

describe("blog WebMCP tools", () => {
  it("searches title, description, and tags with ranked results", () => {
    const result = searchPostSummaries(posts, "cloudflare");

    expect(result.total).toBe(1);
    expect(result.posts[0]?.slug).toBe("cloudflare-workers-site");
  });

  it("accepts Japanese category labels and case-insensitive tags", () => {
    const categoryResult = listPostSummaries(posts, { category: "技術" });
    const tagResult = listPostSummaries(posts, { tag: "nIx" });

    expect(categoryResult.posts.map((post) => post.slug)).toEqual([
      "nix-flakes-dotfiles",
      "cloudflare-workers-site",
    ]);
    expect(tagResult.posts.map((post) => post.slug)).toEqual(["nix-flakes-dotfiles"]);
  });

  it("returns concise metadata and opens only published slugs", async () => {
    const opened: string[] = [];
    const search = toolNamed("search_posts", { getPosts: async () => posts });
    const open = toolNamed("open_post", {
      getPosts: async () => posts,
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
});
