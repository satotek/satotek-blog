import { defineConfig } from "vite";

import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";

import viteReact from "@vitejs/plugin-react";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart({
      // MarkdownとShikiはデプロイ時に実行し、公開済みページは静的HTMLとして配信する。
      // 動的なserver routeや将来のCMSプレビュー用にWorker SSR自体は残す。
      prerender: {
        enabled: true,
        concurrency: 2,
        crawlLinks: true,
        // The home page reads the current GA4 snapshot at request time.
        filter: ({ path }) => path !== "/",
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
});

export default config;
