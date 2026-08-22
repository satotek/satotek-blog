import { describe, expect, it } from "vite-plus/test";

import { aggregatePopularPosts, postPathToSlug } from "./popular-posts";

describe("popular posts", () => {
  it("normalizes GA4 post paths to slugs", () => {
    expect(postPathToSlug("/posts/first-post")).toBe("first-post");
    expect(postPathToSlug("/posts/first-post/?utm_source=example")).toBe("first-post");
    expect(postPathToSlug("/posts/first%2Dpost/")).toBe("first-post");
    expect(postPathToSlug("/categories/technology")).toBeUndefined();
  });

  it("aggregates rows for the same article and sorts by total views", () => {
    const result = aggregatePopularPosts([
      {
        slug: "first-post",
        title: "はじめまして",
        path: "/posts/first-post",
        views: 3,
      },
      {
        slug: "nix-flakes-dotfiles",
        title: "dotfiles を Nix Flakes で管理している話",
        path: "/posts/nix-flakes-dotfiles",
        views: 5,
      },
      {
        slug: "first-post",
        title: "はじめまして",
        path: "/posts/first-post/",
        views: 4,
      },
    ]);

    expect(result).toEqual([
      {
        slug: "first-post",
        title: "はじめまして",
        path: "/posts/first-post",
        views: 7,
      },
      {
        slug: "nix-flakes-dotfiles",
        title: "dotfiles を Nix Flakes で管理している話",
        path: "/posts/nix-flakes-dotfiles",
        views: 5,
      },
    ]);
  });
});
