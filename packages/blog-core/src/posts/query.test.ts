import { describe, expect, it } from "vite-plus/test";

import {
  findPublishedPost,
  listPublishedPosts,
  normalizeLimit,
  rankPublishedPosts,
  searchPublishedPosts,
  taxonomyForPosts,
} from "./query.ts";
import type { PostSummary } from "./types.ts";

function post(overrides: Partial<PostSummary> & Pick<PostSummary, "slug">): PostSummary {
  return {
    readingMinutes: 3,
    title: overrides.slug,
    date: "2026-01-01",
    category: "tech",
    description: "",
    tags: [],
    ...overrides,
  };
}

const posts = [
  post({
    slug: "workers",
    title: "Cloudflare Workers でブログを作る",
    date: "2026-03-01",
    tags: ["Cloudflare", "TypeScript"],
  }),
  post({
    slug: "nix",
    title: "Nix flakes の dotfiles",
    date: "2026-02-01",
    description: "Cloudflare は出てこない",
    tags: ["Nix"],
  }),
  post({
    slug: "trip",
    title: "京都旅行",
    date: "2026-04-01",
    category: "travel",
    tags: ["京都"],
  }),
];

describe("searchPublishedPosts", () => {
  it("ranks a title match above a description match", () => {
    const result = searchPublishedPosts(posts, "cloudflare");
    expect(result.posts.map((item) => item.slug)).toEqual(["workers", "nix"]);
  });

  it("requires every term to match somewhere", () => {
    expect(searchPublishedPosts(posts, "cloudflare nix").posts.map((item) => item.slug)).toEqual([
      "nix",
    ]);
  });

  it("matches full-width input and the category name", () => {
    expect(searchPublishedPosts(posts, "ＮＩＸ").total).toBe(1);
    expect(searchPublishedPosts(posts, "旅行").posts[0]?.slug).toBe("trip");
  });

  it("rejects an empty query", () => {
    expect(() => searchPublishedPosts(posts, "   ")).toThrow(/non-empty/);
  });
});

describe("listPublishedPosts", () => {
  it("filters by category slug or display name", () => {
    expect(listPublishedPosts(posts, { category: "travel" }).total).toBe(1);
    expect(listPublishedPosts(posts, { category: "旅行" }).total).toBe(1);
  });

  it("filters by tag case-insensitively", () => {
    expect(listPublishedPosts(posts, { tag: "typescript" }).posts[0]?.slug).toBe("workers");
  });

  it("reports when more posts exist than the limit returns", () => {
    expect(listPublishedPosts(posts, {}, 2)).toMatchObject({
      total: 3,
      returned: 2,
      hasMore: true,
    });
  });
});

describe("normalizeLimit", () => {
  it("accepts 1 to 10 and rejects the rest", () => {
    expect(normalizeLimit(1)).toBe(1);
    expect(normalizeLimit(10)).toBe(10);
    for (const bad of [0, 11, 1.5, Number.NaN]) {
      expect(() => normalizeLimit(bad)).toThrow();
    }
  });
});

describe("findPublishedPost", () => {
  it("builds the public URL and the category name", () => {
    expect(findPublishedPost(posts, "trip", "https://example.test")).toMatchObject({
      url: "https://example.test/posts/trip",
      category: "旅行",
      categorySlug: "travel",
    });
    expect(findPublishedPost(posts, "missing")).toBeUndefined();
  });
});

describe("taxonomyForPosts", () => {
  it("counts every known category and sorts tags by use", () => {
    const taxonomy = taxonomyForPosts([...posts, post({ slug: "more", tags: ["Nix"] })]);
    expect(taxonomy.categories.find((category) => category.slug === "tech")?.count).toBe(3);
    expect(taxonomy.categories.find((category) => category.slug === "daily")?.count).toBe(0);
    expect(taxonomy.tags[0]).toEqual({ name: "Nix", count: 2 });
  });
});

describe("rankPublishedPosts", () => {
  it("drops unknown slugs and renumbers the rest", () => {
    const ranked = rankPublishedPosts(
      [
        { slug: "gone", title: "gone", path: "/posts/gone", views: 99 },
        { slug: "nix", title: "nix", path: "/posts/nix", views: 10 },
        { slug: "trip", title: "trip", path: "/posts/trip", views: 5 },
      ],
      posts,
    );
    expect(ranked.map(({ rank, slug }) => [rank, slug])).toEqual([
      [1, "nix"],
      [2, "trip"],
    ]);
  });
});
