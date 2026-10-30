import { describe, expect, it, vi } from "vite-plus/test";

import type { PostSummary } from "@satotek/blog-core/posts/types";

function post(index: number, overrides: Partial<PostSummary> = {}): PostSummary {
  const day = String(28 - (index % 28)).padStart(2, "0");
  return {
    readingMinutes: 3,
    slug: `post-${index}`,
    title: `Post ${index}`,
    date: `2026-01-${day}`,
    category: "tech",
    description: "",
    tags: [],
    ...overrides,
  };
}

const posts: PostSummary[] = [
  post(0, {
    title: `Tom & Jerry <"quotes">`,
    description: "A & B",
    tags: ["C++", "R&D"],
    cover: "https://img.example.test/cover.webp?w=1&h=2",
  }),
  ...Array.from({ length: 24 }, (_, index) => post(index + 1)),
];

vi.mock("#/lib/posts/repository", () => ({
  postRepository: { list: async () => posts },
}));

vi.mock("#/lib/posts/post-sources.server", () => ({
  getPublishedPostSources: () =>
    posts.slice(0, 2).map((summary) => ({ summary, markdown: `Body of ${summary.slug}` })),
}));

const { feedResponse, llmsFullResponse, llmsResponse, robotsResponse, sitemapResponse } =
  await import("./site-responses");

/** XML の本文に、エスケープされていない & や < が残っていないか。 */
function unescapedMarkup(xml: string) {
  const text = xml.replace(/<[^>]+>/g, "");
  return text.match(/&(?!amp;|lt;|gt;|quot;|apos;)|</g);
}

describe("feed.xml", () => {
  it("escapes titles, descriptions, and tags", async () => {
    const xml = await (await feedResponse()).text();
    expect(xml).toContain("<title>Tom &amp; Jerry &lt;&quot;quotes&quot;&gt;</title>");
    expect(xml).toContain("<category>R&amp;D</category>");
    expect(unescapedMarkup(xml)).toBeNull();
  });

  it("lists the newest 20 posts with RFC 822 dates", async () => {
    const xml = await (await feedResponse()).text();
    expect(xml.match(/<item>/g)).toHaveLength(20);
    expect(xml).toMatch(/<pubDate>\w{3}, \d{2} \w{3} 2026 00:00:00 GMT<\/pubDate>/);
  });

  it("is served as UTF-8 XML", async () => {
    expect((await feedResponse()).headers.get("content-type")).toBe(
      "application/xml; charset=utf-8",
    );
  });
});

describe("sitemap.xml", () => {
  it("lists every post, category with posts, and tag", async () => {
    const xml = await (await sitemapResponse()).text();
    for (const { slug } of posts) expect(xml).toContain(`/posts/${slug}</loc>`);
    expect(xml).toContain("/categories/tech</loc>");
    expect(xml).not.toContain("/categories/travel</loc>");
    expect(xml).toContain(`/tags/${encodeURIComponent("R&D").replace(/&/g, "&amp;")}</loc>`);
  });

  it("escapes the cover image URL", async () => {
    const xml = await (await sitemapResponse()).text();
    expect(xml).toContain("<image:loc>https://img.example.test/cover.webp?w=1&amp;h=2</image:loc>");
    expect(unescapedMarkup(xml)).toBeNull();
  });
});

describe("text routes", () => {
  it("points robots.txt at the sitemap", async () => {
    expect(await robotsResponse().text()).toMatch(/^Sitemap: https:\/\/.+\/sitemap\.xml$/m);
  });

  it("links every post from llms.txt", async () => {
    const text = await (await llmsResponse()).text();
    for (const { slug } of posts) expect(text).toContain(`/posts/${slug})`);
  });

  it("puts the metadata and body of each post in llms-full.txt", async () => {
    const text = await llmsFullResponse().text();
    expect(text).toContain("Category: 技術");
    expect(text).toContain("Tags: C++, R&D");
    expect(text).toContain("Body of post-1");
  });
});
