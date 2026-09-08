import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

import { defineConfig } from "vite-plus";

import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";

import viteReact from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import { createMdxPlugins, readImageDimensions } from "@satotek/content-pipeline";
import { createResponsiveMedia } from "./src/lib/media-variants";
import { mediaUrlForKey } from "./src/lib/posts/post-assets";

const contentPostsDirectory = resolve(process.cwd(), "src/content/posts");

const mediaBaseUrl = (
  process.env.R2_PUBLIC_BASE_URL?.trim() ||
  process.env.VITE_MEDIA_BASE_URL?.trim() ||
  "https://img.satotek.dev"
).replace(/\/+$/, "");

/** src/content/posts/<slug>/assets/<file> を R2 のオブジェクトキーへ写す。 */
function mediaKeyForPostAsset(assetPath: string) {
  const segments = relative(contentPostsDirectory, assetPath).split(sep);
  if (segments.length !== 3 || segments[1] !== "assets") return undefined;
  if (segments[0] === "" || segments[0] === "..") return undefined;
  return `${segments[0]}/${segments[2]}`;
}

function isAbsoluteUrl(source: string) {
  try {
    new URL(source);
    return true;
  } catch {
    return false;
  }
}

/**
 * 記事に隣接する assets/ の原本から、配信 URL と実寸を組み立てる。
 * 原本がリポジトリにあるので寸法はここで測れる。生成物をコミットする
 * マニフェストは要らない。
 */
async function resolvePostImage(source: string, filePath: string | undefined) {
  if (isAbsoluteUrl(source)) {
    const responsive = createResponsiveMedia(source, {
      baseUrl: mediaBaseUrl,
      sizes: "(max-width: 768px) 100vw, 768px",
    });
    return responsive ? { ...responsive } : undefined;
  }

  if (!filePath) {
    throw new Error(`Cannot resolve the relative image ${source}: the MDX path is unknown`);
  }

  const assetPath = resolve(dirname(filePath.split("?")[0]), source);
  const key = mediaKeyForPostAsset(assetPath);
  if (!key) {
    throw new Error(`${source} in ${filePath} must live in the post's own assets/ directory`);
  }
  if (!existsSync(assetPath)) {
    throw new Error(
      `Missing image ${relative(process.cwd(), assetPath)} referenced by ${filePath}`,
    );
  }

  const url = mediaUrlForKey(mediaBaseUrl, key);
  const responsive = createResponsiveMedia(url, {
    baseUrl: mediaBaseUrl,
    sizes: "(max-width: 768px) 100vw, 768px",
  });
  const dimensions = await readImageDimensions(assetPath);

  return { src: url, ...responsive, ...dimensions };
}

function mdxPlugin() {
  const plugin = mdx({
    jsxImportSource: "react",
    ...createMdxPlugins({
      resolveImage: (source, { filePath }) => resolvePostImage(source, filePath),
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

function isMarkdownPost(file: string) {
  const relativePath = relative(contentPostsDirectory, resolve(file));
  const segments = relativePath.split(sep);

  return segments.length === 2 && segments[1] === "index.mdx";
}

/** 原本を差し替えたら、その寸法を焼き込んだ記事モジュールを作り直す。 */
function postForChangedAsset(file: string) {
  const segments = relative(contentPostsDirectory, resolve(file)).split(sep);
  if (segments.length !== 3 || segments[1] !== "assets") return undefined;
  return join(contentPostsDirectory, segments[0], "index.mdx");
}

function regeneratePostContent() {
  return new Promise<void>((resolvePromise, reject) => {
    const child = spawn("bun", ["run", "generate-summaries"], {
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
        new Error(`generate-summaries exited with ${signal ? `signal ${signal}` : `code ${code}`}`),
      );
    });
  });
}

type HotModule = { id: string | null };

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
      server: {
        moduleGraph: {
          getModulesByFile: (file: string) => Set<HotModule> | undefined;
          invalidateModule: (module: HotModule) => void;
        };
        ws: { send: (message: { type: "full-reload" }) => void };
      };
    }) {
      const changedPost = postForChangedAsset(file);
      if (changedPost) {
        for (const module of server.moduleGraph.getModulesByFile(changedPost) ?? []) {
          server.moduleGraph.invalidateModule(module);
        }
        server.ws.send({ type: "full-reload" });
        return [];
      }

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
