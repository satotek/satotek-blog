import { defineConfig } from "void/config";

import { DEFERRED_FONTS_SCRIPT, FONTS_HREF } from "./src/lib/fonts";
import { SITE_URL } from "./src/core/site-url";
import { SITE_DESCRIPTION, SITE_NAME, createSocialMeta } from "./src/lib/site";
import { THEME_COLOR, THEME_INIT_SCRIPT } from "./src/lib/theme";

export default defineConfig({
  // 記事は全部ビルド時に決まるので静的に書き出し、loader や API のあるところだけ Worker で動かす。
  output: "static",
  routing: {
    typedRoutes: true,
    // カテゴリとタグの一覧は記事一覧の絞り込みに統合した。既存のリンクは記事一覧へ送る。
    redirects: {
      "/categories": { to: "/posts", status: 301 },
      "/tags": { to: "/posts", status: 301 },
    },
  },
  head: {
    // ページの title はサイト名まで含めて createPageHead が組み立てる。ホームはサイト名だけにしたいので
    // テンプレートは使わない（Void はページ側の titleTemplate を見ない）。
    title: SITE_NAME,
    htmlAttrs: { lang: "ja" },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "description", content: SITE_DESCRIPTION },
      // 404 やエラー画面など、ページ側で OGP を組まないときの既定値。ページの同名 meta が上書きする。
      ...createSocialMeta({
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        includeImageDimensions: false,
      }),
      // 明示選択時は THEME_INIT_SCRIPT が media を差し替えて片方だけ有効にするので、先に置く。
      {
        name: "theme-color",
        media: "(prefers-color-scheme: light)",
        content: THEME_COLOR.light,
        "data-scheme": "light",
      },
      {
        name: "theme-color",
        media: "(prefers-color-scheme: dark)",
        content: THEME_COLOR.dark,
        "data-scheme": "dark",
      },
    ],
    link: [
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/icons/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: SITE_NAME,
        href: `${SITE_URL}/feed.xml`,
      },
      // フォント定義は初回描画のあとに有効にする（DEFERRED_FONTS_SCRIPT）。
      { rel: "preload", as: "style", href: FONTS_HREF, "data-site-fonts": "deferred" },
    ],
    // middleware で headDefaults を入れると全ページが Worker 経由になり、
    // 静的配信の利点が消える。描画前に効かせたいスクリプトは config に置く。
    script: [{ innerHTML: THEME_INIT_SCRIPT }, { innerHTML: DEFERRED_FONTS_SCRIPT }],
  },
  worker: {
    compatibility_date: "2026-08-22",
    compatibility_flags: ["nodejs_compat"],
  },
  cloudflare: {
    name: "satotek",
    routes: [{ pattern: "satotek.dev", custom_domain: true }],
    // 公開先は satotek.dev だけにして、workers.dev に同じ内容を出さない。
    workers_dev: false,
    // Void は切り替え前に新しい版を版ごとの URL で叩いて確かめるので、版の URL は開けておく。
    preview_urls: true,
    observability: {
      enabled: true,
      logs: { enabled: true, invocation_logs: true, head_sampling_rate: 1 },
    },
  },
});
