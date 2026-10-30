import { spawn } from "node:child_process";

import type { Plugin } from "vite-plus";

import { contentPostsDirectory, isMarkdownPost, postAsset, postMarkdownFor } from "./post-paths";

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

export function postContentWatcher(): Plugin {
  let generation: Promise<void> | undefined;

  return {
    name: "post-content-watcher",
    configureServer(server) {
      server.watcher.add(contentPostsDirectory);
    },
    async handleHotUpdate({ file, server }) {
      // 原本を差し替えたら、その寸法を焼き込んだ記事モジュールを作り直す。
      const asset = postAsset(file);
      if (asset) {
        for (const module of server.moduleGraph.getModulesByFile(postMarkdownFor(asset.slug)) ??
          []) {
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
