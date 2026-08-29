import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, type ReactNode } from "react";

import { DeferredAnalytics } from "#/components/DeferredAnalytics";
import { NotFound } from "#/components/NotFound";
import { SiteChrome } from "#/components/SiteChrome";
import { RouterLink } from "#/components/ui";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  WEBMCP_ORIGIN_TRIAL_TOKEN,
  createSocialMeta,
} from "#/lib/site";
import appCss from "../styles.css?url";

// エラー画面でしか使わないゲームは通常ページの初期バンドルへ含めない。
const BlockPuzzle = lazy(() =>
  import("#/components/games/BlockPuzzle").then(({ BlockPuzzle: component }) => ({
    default: component,
  })),
);
const BugHunt = lazy(() =>
  import("#/components/games/BugHunt").then(({ BugHunt: component }) => ({
    default: component,
  })),
);

const THEME_INIT_SCRIPT = `(() => {
  try {
    const savedTheme = localStorage.getItem("theme");
    const theme = savedTheme === "light" || savedTheme === "dark" ? savedTheme : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();`;

const FONTS_HREF = "/fonts.css";

// 同一オリジンでも as="font" の preload は crossorigin 必須。付け忘れると
// 二重取得になり、先読みが逆効果になる。
const LATIN_FONT_PRELOADS = ["/fonts/geist-400-4.woff2", "/fonts/geist-700-9.woff2"].map(
  (href) =>
    ({ rel: "preload", href, as: "font", type: "font/woff2", crossOrigin: "anonymous" }) as const,
);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_NAME },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "theme-color", content: "#1f1e1d" },
      ...createSocialMeta({
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        includeImageDimensions: false,
      }),
    ],
    links: [
      // woff2 の URL は fonts.css をパースし終えるまで判明せず、取得は HTML→CSS→font の
      // 3 往復目になる。全ページで必ず使う Latin 基本域だけ先読みして 1 段短くする。
      // 和文は端末内蔵に任せているので、先読みするのはこの 2 つで足りる。
      ...LATIN_FONT_PRELOADS,
      { rel: "stylesheet", href: appCss },
      // フォント定義は通常の stylesheet として読む。JS で差し込むと
      // プリロードスキャナに発見されず、取得が数十ms遅れるため。
      { rel: "stylesheet", href: FONTS_HREF },
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
    ],
  }),
  notFoundComponent: RootNotFound,
  errorComponent: RootError,
  shellComponent: RootDocument,
});

// 404 は、ネット接続が切れたときのブラウザ内ゲームよろしく、その場で遊べるようにしてある。
function RootNotFound() {
  return (
    <NotFound
      title="ページが見つかりません。"
      description="せっかくなので、ブロックパズルでもどうぞ。"
    >
      <RouterLink className="text-accent underline underline-offset-2" to="/">
        ← Homeへ戻る
      </RouterLink>
      <div className="mt-8">
        <Suspense fallback={<GameLoading label="ブロックパズル" />}>
          <BlockPuzzle />
        </Suspense>
      </div>
    </NotFound>
  );
}

// 素のエラー画面を見せず、404 と同じトーンで整える。
function RootError() {
  return (
    <NotFound
      code="500"
      title="サーバー側で問題が発生しました。"
      description="復旧までの間、バグ退治でもどうぞ。"
    >
      <RouterLink className="text-accent underline underline-offset-2" to="/">
        ← Homeへ戻る
      </RouterLink>
      <div className="mt-8">
        <Suspense fallback={<GameLoading label="バグ退治" />}>
          <BugHunt />
        </Suspense>
      </div>
    </NotFound>
  );
}

function GameLoading({ label }: { label: string }) {
  return (
    <p className="rounded-site border border-line bg-card px-4 py-6 text-muted" role="status">
      {label}を読み込んでいます…
    </p>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // テーマのちらつき防止スクリプトがハイドレーション前に data-theme を付けるため、
    // html 自身の属性だけ不一致の検出から外す。子孫の不一致は引き続き検出される。
    <html lang="ja" suppressHydrationWarning>
      <head>
        {WEBMCP_ORIGIN_TRIAL_TOKEN ? (
          <meta httpEquiv="origin-trial" content={WEBMCP_ORIGIN_TRIAL_TOKEN} />
        ) : null}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <SiteChrome>
          <main className="mx-auto max-w-[1120px] px-4 pb-6 pt-2 sm:px-6">{children}</main>
        </SiteChrome>
        <DeferredAnalytics />
        <DeferredWebMcp />
        <Scripts />
      </body>
    </html>
  );
}

function DeferredWebMcp() {
  useEffect(() => {
    try {
      if (!document.modelContext) return;
    } catch {
      return;
    }

    // WebMCP が有効なブラウザでだけ専用コードを読み込む。
    void import("#/webmcp/register").catch((error: unknown) => {
      console.warn("[WebMCP] Could not load blog tools.", error);
    });
  }, []);

  return null;
}
