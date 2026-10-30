import { defineConfig } from "vite-plus";

import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";

import viteReact from "@vitejs/plugin-react";
import { apiDev } from "./vite-plugins/api-dev";
import { postContentWatcher } from "./vite-plugins/post-content-watcher";
import { postMdx } from "./vite-plugins/post-mdx";

const config = defineConfig(({ mode }) => {
  const isTest = mode === "test";

  return {
    resolve: { tsconfigPaths: true },
    test: {
      include: [
        "src/**/*.test.ts",
        "packages/**/*.test.ts",
        "workers/**/*.test.ts",
        "scripts/**/*.test.tsx",
      ],
    },
    lint: {
      options: {
        typeAware: true,
        typeCheck: true,
      },
    },
    staged: {
      "*.{js,jsx,ts,tsx}": "vp check --fix",
    },
    plugins: isTest
      ? []
      : [
          tailwindcss(),
          postMdx(),
          postContentWatcher(),
          cloudflare({ viteEnvironment: { name: "ssr" } }),
          apiDev(),
          tanstackStart({
            // CSS を外部ファイルにすると、HTML 到着後にもう一往復が要り、その取得が
            // modulepreload された JS と帯域を奪い合う。描画はそれを待つので FCP が
            // 数百ms 遅れる。prerender した HTML へ直接埋め込んで往復ごと無くす。
            // 対象は Vite がチャンクとして追跡する CSS だけなので、styles.css は
            // ?url ではなく通常の import で読む必要がある（__root.tsx）。
            server: { build: { inlineCss: { enabled: true } } },
            // MarkdownとShikiはデプロイ時に実行し、公開済みページは静的HTMLとして配信する。
            // 動的なserver routeや将来のCMSプレビュー用にWorker SSR自体は残す。
            prerender: {
              enabled: true,
              concurrency: 2,
              crawlLinks: true,
              // ホームのランキングはブラウザが /api/posts/popular から埋める。
              // /play/* は隠しゲームの入口で、片方は存在してはいけない URL、
              // もう片方はわざと例外を投げる。
              filter: ({ path }) => !path.startsWith("/play/"),
              failOnError: true,
            },
            pages: [
              { path: "/robots.txt", prerender: { crawlLinks: false } },
              { path: "/sitemap.xml", prerender: { crawlLinks: false } },
              { path: "/feed.xml", prerender: { crawlLinks: false } },
              { path: "/llms.txt", prerender: { crawlLinks: false } },
              { path: "/llms-full.txt", prerender: { crawlLinks: false } },
              {
                path: "/.well-known/security.txt",
                prerender: { crawlLinks: false },
              },
            ],
            // sitemap.xmlは既存のカスタムレスポンスを使う。
            sitemap: { enabled: false },
          }),
          viteReact(),
        ],
  };
});

export default config;
