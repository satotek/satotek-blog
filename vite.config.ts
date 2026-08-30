import { spawn } from "node:child_process";
import { relative, resolve, sep } from "node:path";

import { defineConfig } from "vite-plus";

import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";

import viteReact from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import { createMdxPlugins } from "@satotek/content-pipeline";
import { createResponsiveMedia } from "./src/lib/media-variants";
import { mediaKeyFromUrl, type MediaManifest } from "./src/lib/media-manifest";
import { readFileSync } from "node:fs";

const mediaBaseUrl = (
  process.env.R2_PUBLIC_BASE_URL?.trim() ||
  process.env.VITE_MEDIA_BASE_URL?.trim() ||
  "https://img.satotek.dev"
).replace(/\/+$/, "");

function readMediaManifest(): MediaManifest {
  try {
    return JSON.parse(
      readFileSync(resolve(process.cwd(), "src/content/media-manifest.json"), "utf8"),
    );
  } catch {
    return {};
  }
}

function mdxPlugin() {
  const manifest = readMediaManifest();
  const plugin = mdx({
    jsxImportSource: "react",
    providerImportSource: "@mdx-js/react",
    ...createMdxPlugins({
      resolveImage: (source) => {
        const responsive = createResponsiveMedia(source, {
          baseUrl: mediaBaseUrl,
          sizes: "(max-width: 768px) 100vw, 768px",
        });
        const key = mediaKeyFromUrl(source, mediaBaseUrl);
        const dimensions = key ? manifest[key] : undefined;
        if (!responsive && !dimensions) return undefined;
        return { ...responsive, ...dimensions };
      },
    }),
  });

  // 原文は llms-full.txt と読了時間が ?raw で読む。MDX プラグインは
  // enforce: "pre" で先に走るので、明示的に素通しさせる必要がある。
  const transform = plugin.transform;
  return {
    ...plugin,
    enforce: "pre" as const,
    transform(this: unknown, code: string, id: string) {
      if (id.includes("?raw")) return null;
      return (transform as (code: string, id: string) => unknown).call(this, code, id);
    },
  };
}

const contentPostsDirectory = resolve(process.cwd(), "src/content/posts");

function isMarkdownPost(file: string) {
  const relativePath = relative(contentPostsDirectory, resolve(file));
  const segments = relativePath.split(sep);

  return segments.length === 2 && segments[1] === "index.mdx";
}

function regeneratePostContent() {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn("bun", ["run", "generate-content"], {
      cwd: process.cwd(),
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(
        new Error(`generate-content exited with ${signal ? `signal ${signal}` : `code ${code}`}`),
      );
    });
  });
}

function postContentWatcher() {
  let generation: Promise<void> | undefined;

  return {
    name: "post-content-watcher",
    configureServer(server: { watcher: { add: (path: string) => void } }) {
      server.watcher.add(contentPostsDirectory);
    },
    async handleHotUpdate({
      file,
      server,
    }: {
      file: string;
      server: { ws: { send: (message: { type: "full-reload" }) => void } };
    }) {
      if (!isMarkdownPost(file)) return;

      generation ??= regeneratePostContent().finally(() => {
        generation = undefined;
      });

      try {
        await generation;
        server.ws.send({ type: "full-reload" });
      } catch (error) {
        console.error("[post-content-watcher] Could not regenerate Markdown content.", error);
      }

      return [];
    },
  };
}

const config = defineConfig(({ mode }) => {
  const isTest = mode === "test";

  return {
    resolve: { tsconfigPaths: true },
    test: {
      include: ["src/**/*.test.ts", "packages/**/*.test.ts"],
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
          mdxPlugin(),
          postContentWatcher(),
          cloudflare({ viteEnvironment: { name: "ssr" } }),
          tanstackStart({
            // MarkdownとShikiはデプロイ時に実行し、公開済みページは静的HTMLとして配信する。
            // 動的なserver routeや将来のCMSプレビュー用にWorker SSR自体は残す。
            prerender: {
              enabled: true,
              concurrency: 2,
              crawlLinks: true,
              // The home page uses Pick up in the prerendered HTML and fetches
              // the optional GA4 ranking after hydration.
              // /play/* are the hidden-game entrances: one is a URL that must
              // stay missing, the other throws on purpose.
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
