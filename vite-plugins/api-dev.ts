import type { Plugin } from "vite-plus";

/** 開発中は /api を同じポートで Elysia に渡す。本番は workers/api の Worker が受ける。 */
export function apiDev(): Plugin {
  return {
    name: "satotek-api-dev",
    apply: "serve",
    async configureServer(server) {
      const { handleApiDevRequest } = await import("../workers/api/src/dev.ts");
      server.middlewares.use((req, res, next) => {
        void handleApiDevRequest(req, res, next);
      });
    },
  };
}
