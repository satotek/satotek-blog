import { categoryBySlug, getCategories, getTags, tagPath } from "#/data/navigation";
import { posts } from "#/data/posts";
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

export function sitemapResponse() {
  const urls: Array<{ loc: string; lastmod?: string; image?: string }> = [
    { loc: "/", lastmod: posts[0]?.date },
    { loc: "/categories" },
    { loc: "/tags" },
    { loc: "/profile" },
    ...getCategories()
      .filter((category) => category.count > 0)
      .map((category) => ({
        loc: `/categories/${category.slug}`,
        lastmod: posts.find((post) => post.category === category.slug)?.date,
      })),
    ...getTags().map((tag) => ({
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

export function llmsResponse() {
  const categoryNames = getCategories()
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
  const sections = posts.map((post) => {
    const category = categoryBySlug(post.category)?.name ?? post.category;
    const meta = [
      `URL: ${SITE_URL}/posts/${post.slug}`,
      `Date: ${post.date}`,
      `Category: ${category}`,
      post.tags.length ? `Tags: ${post.tags.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return `# ${post.title}\n\n${meta}\n\n${post.paragraphs.join("\n\n")}`;
  });

  return textResponse(
    `# satotek.dev

> nosuke の個人ブログ・技術メモ。以下は全公開記事の本文をまとめたものです。

${sections.join("\n\n---\n\n")}\n`,
    "text/plain",
    3600,
  );
}

export function feedResponse() {
  const items = posts.slice(0, 20);
  const lastBuildDate = rfc822(posts[0]?.date ?? new Date().toISOString().slice(0, 10));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>
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

  return textResponse(body, "application/rss+xml", 3600);
}

export function feedStylesheetResponse() {
  return textResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>
  <xsl:template match="/">
    <html lang="ja">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="/rss/channel/title"/> — RSS フィード</title>
        <style>
          :root { color-scheme: light dark; --bg:#f3ece0; --fg:#2e2820; --muted:#6f6657; --accent:#a0412a; --line:rgba(46,40,32,.14); --card:rgba(46,40,32,.04); }
          @media (prefers-color-scheme: dark) { :root { --bg:#1f1e1d; --fg:#edeae2; --muted:#a39e94; --accent:#e0876a; --line:rgba(237,234,226,.16); --card:rgba(237,234,226,.05); } }
          * { box-sizing:border-box; }
          body { margin:0; background:var(--bg); color:var(--fg); line-height:1.65; font-family:ui-sans-serif,system-ui,sans-serif; }
          .wrap { max-width:820px; margin:0 auto; padding:2.5rem 1.25rem 4rem; }
          .banner { border:1px solid var(--line); background:var(--card); border-radius:14px; padding:1rem 1.25rem; margin-bottom:2.5rem; }
          .banner strong { color:var(--accent); } .banner p { color:var(--muted); } .banner code { display:block; overflow-wrap:anywhere; }
          h1 { margin:0 0 .25rem; } h1 a, h2 a { color:var(--accent); text-decoration:none; } .desc, .meta { color:var(--muted); }
          hr { border:0; border-top:1px solid var(--line); margin:0 0 1rem; } article { padding:1.25rem 0; border-bottom:1px solid var(--line); }
          article h2 { margin:0 0 .35rem; font-size:1.2rem; } .item-desc { margin:.25rem 0 .6rem; } .tags { display:flex; flex-wrap:wrap; gap:.4rem; }
          .tag { color:var(--muted); border:1px solid var(--line); border-radius:999px; padding:.1rem .6rem; font-size:.78rem; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="banner"><strong>📡 これは RSS フィードです</strong><p>下の URL をフィードリーダーに登録すると、新着記事を購読できます。</p><code><xsl:value-of select="/rss/channel/atom:link/@href"/></code></div>
          <header><h1><a href="{/rss/channel/link}"><xsl:value-of select="/rss/channel/title"/></a></h1><p class="desc"><xsl:value-of select="/rss/channel/description"/></p></header>
          <hr/>
          <main><xsl:for-each select="/rss/channel/item"><article><h2><a href="{link}"><xsl:value-of select="title"/></a></h2><div class="meta"><xsl:value-of select="pubDate"/></div><xsl:if test="description"><p class="item-desc"><xsl:value-of select="description"/></p></xsl:if><xsl:if test="category"><div class="tags"><xsl:for-each select="category"><span class="tag"><xsl:value-of select="."/></span></xsl:for-each></div></xsl:if></article></xsl:for-each></main>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
`,
    "text/xsl",
    86400,
  );
}
