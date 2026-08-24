import { categoryBySlug, getCategories, getTags, tagPath } from "#/data/navigation";
import { postRepository } from "#/content/repository";
import { getPublishedMarkdownSources } from "#/content/markdown-sources.server";
import { absoluteUrl, SITE_DESCRIPTION, SITE_URL } from "#/lib/site";

function textResponse(body: string, contentType: string, maxAge: number) {
  return new Response(body, {
    headers: {
      "Cache-Control": `public, max-age=${maxAge}`,
      "Content-Type": `${contentType}; charset=utf-8`,
    },
  });
}

function xmlEscape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character] ?? character,
  );
}

function rfc822(date: string) {
  return new Date(`${date}T00:00:00.000Z`).toUTCString();
}

export function robotsResponse() {
  return textResponse(
    `User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /
Disallow: /admin
Disallow: /auth
Disallow: /callback
Disallow: /preview

Sitemap: ${SITE_URL}/sitemap.xml
`,
    "text/plain",
    3600,
  );
}

export function securityResponse() {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return textResponse(
    `Contact: ${SITE_URL}/profile
Expires: ${expires}
Preferred-Languages: ja, en
Canonical: ${SITE_URL}/.well-known/security.txt
`,
    "text/plain",
    86400,
  );
}

export async function sitemapResponse() {
  const [posts, categories, tags] = await Promise.all([
    postRepository.list(),
    getCategories(),
    getTags(),
  ]);
  const urls: Array<{ loc: string; lastmod?: string; image?: string }> = [
    { loc: "/", lastmod: posts[0]?.date },
    { loc: "/categories" },
    { loc: "/tags" },
    { loc: "/profile" },
    ...categories
      .filter((category) => category.count > 0)
      .map((category) => ({
        loc: `/categories/${category.slug}`,
        lastmod: posts.find((post) => post.category === category.slug)?.date,
      })),
    ...tags.map((tag) => ({
      loc: tagPath(tag.name),
      lastmod: posts.find((post) => post.tags.includes(tag.name))?.date,
    })),
    ...posts.map((post) => ({
      loc: `/posts/${post.slug}`,
      lastmod: post.date,
      image: post.cover ? absoluteUrl(post.cover) : undefined,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
  .map(({ loc, lastmod, image }) => {
    const lastmodElement = lastmod ? `<lastmod>${lastmod}</lastmod>` : "";
    const imageElement = image
      ? `<image:image><image:loc>${xmlEscape(image)}</image:loc></image:image>`
      : "";
    return `  <url><loc>${xmlEscape(absoluteUrl(loc))}</loc>${lastmodElement}${imageElement}</url>`;
  })
  .join("\n")}
</urlset>
`;

  return textResponse(body, "application/xml", 3600);
}

export async function llmsResponse() {
  const [posts, categories] = await Promise.all([postRepository.list(), getCategories()]);
  const categoryNames = categories
    .filter((category) => category.count > 0)
    .map((category) => category.name)
    .join(" / ");

  const pages = [
    `- [トップ](${SITE_URL}/): 最新記事の一覧`,
    `- [カテゴリ一覧](${SITE_URL}/categories)${categoryNames ? `: ${categoryNames}` : ""}`,
    `- [タグ一覧](${SITE_URL}/tags)`,
    `- [プロフィール](${SITE_URL}/profile): 著者紹介・プライバシーポリシー・お問い合わせ`,
  ];

  const articles = posts.map(
    (post) =>
      `- [${post.title}](${SITE_URL}/posts/${post.slug})${post.description ? `: ${post.description}` : ""}`,
  );

  return textResponse(
    `# satotek.dev

> nosuke の個人ブログ・技術メモ。技術・ガジェット・旅行・日常について気ままに書いています。Cloudflare Workers + TanStack Start で構築しています。

## 主要ページ
${pages.join("\n")}

## 記事
${articles.join("\n")}

## 補足
- [全文（LLM向け）](${SITE_URL}/llms-full.txt): 全記事の本文を1ファイルにまとめたもの
- [RSS フィード](${SITE_URL}/feed.xml)
- [サイトマップ](${SITE_URL}/sitemap.xml)
`,
    "text/plain",
    3600,
  );
}

export function llmsFullResponse() {
  const sources = getPublishedMarkdownSources();
  const sections = sources.map(({ summary, markdown }) => {
    const category = categoryBySlug(summary.category)?.name ?? summary.category;
    const meta = [
      `URL: ${SITE_URL}/posts/${summary.slug}`,
      `Date: ${summary.date}`,
      `Category: ${category}`,
      summary.tags.length ? `Tags: ${summary.tags.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return `# ${summary.title}\n\n${meta}\n\n${markdown}`;
  });

  return textResponse(
    `# satotek.dev

> nosuke の個人ブログ・技術メモ。以下は全公開記事の本文をまとめたものです。

${sections.join("\n\n---\n\n")}\n`,
    "text/plain",
    3600,
  );
}

export async function feedResponse() {
  const posts = await postRepository.list();
  const items = posts.slice(0, 20);
  const lastBuildDate = rfc822(posts[0]?.date ?? new Date().toISOString().slice(0, 10));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>satotek.dev</title>
    <link>${SITE_URL}/</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>ja</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items
  .map((post) => {
    const url = `${SITE_URL}/posts/${post.slug}`;
    const description = post.description
      ? `\n      <description>${xmlEscape(post.description)}</description>`
      : "";
    const categories = post.tags
      .map((tag) => `\n      <category>${xmlEscape(tag)}</category>`)
      .join("");

    return `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>${description}${categories}
    </item>`;
  })
  .join("\n")}
  </channel>
</rss>
`;

  return textResponse(body, "application/xml", 0);
}
