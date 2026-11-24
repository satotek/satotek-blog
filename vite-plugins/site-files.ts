import { fileURLToPath } from "node:url";

import { runnerImport, type Plugin } from "vite";

type SiteResponses = typeof import("../src/server/site-responses");

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const responsesModule = fileURLToPath(new URL("../src/server/site-responses.ts", import.meta.url));

const files: Record<string, (responses: SiteResponses) => Response | Promise<Response>> = {
  "feed.xml": (r) => r.feedResponse(),
  "sitemap.xml": (r) => r.sitemapResponse(),
  "robots.txt": (r) => r.robotsResponse(),
  "llms.txt": (r) => r.llmsResponse(),
  "llms-full.txt": (r) => r.llmsFullResponse(),
  ".well-known/security.txt": (r) => r.securityResponse(),
};

/**
 * feed.xml などを routes/ に置くと、そのたびに Worker が応答を組み立てる。中身はビルド時に
 * 決まるので、site-responses.ts をビルド時に実行して静的ファイルとして書き出す。
 *
 * site-responses.ts は import.meta.glob と import.meta.env を使うため、Node で直接は
 * 読めない。scripts/run.ts と同じく Vite のモジュールランナーで読む。
 */
export function siteFiles(): Plugin {
  const load = async () =>
    (
      await runnerImport<SiteResponses>(responsesModule, {
        configFile: false,
        root: appRoot,
        logLevel: "warn",
      })
    ).module;

  return {
    name: "satotek:site-files",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const name = req.url?.split("?")[0]?.replace(/^\//, "");
        const render = name ? files[name] : undefined;
        if (!render) return next();
        const response = await render(await load());
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
    async generateBundle() {
      // クライアントの成果物（dist/client）にだけ書き出す。
      if (this.environment.name !== "client") return;
      const responses = await load();
      for (const [fileName, render] of Object.entries(files)) {
        this.emitFile({ type: "asset", fileName, source: await (await render(responses)).text() });
      }
    },
  };
}
