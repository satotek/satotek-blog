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
import { THEME_COLOR, THEME_INIT_SCRIPT } from "#/lib/theme";
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

const FONTS_HREF = "/fonts.css";

// font-display: swap を宣言している以上、フォントは FCP のクリティカルパスに無い。
// woff2 を preload すると最優先で 58KB を取りに行き、低速回線では描画に必要な
// CSS を押しのける（Slow 4G 実測で FCP 836ms → 1044ms）。先読みするのは定義ファイルだけにとどめる。
// カスタムフォントは font-display: swap なので、フォント定義を待たずに本文を描画できる。
// preload で CSS だけを先に取得し、初回描画後の idle 時に stylesheet へ切り替える。
// これにより HTML → fonts.css → 日本語サブセットという依存を初期表示から外す。
const DEFERRED_FONTS_SCRIPT = `(() => {
  const link = document.querySelector('link[data-site-fonts]');
  if (!link) return;

  const enable = () => {
    link.rel = "stylesheet";
    link.removeAttribute("as");
  };

  const schedule = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(enable, { timeout: 1200 });
    } else {
      window.setTimeout(enable, 0);
    }
  };

  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(schedule);
  } else {
    window.setTimeout(schedule, 0);
  }
})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_NAME },
      { name: "description", content: SITE_DESCRIPTION },
      ...createSocialMeta({
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        includeImageDimensions: false,
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
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
        <link
          rel="preload"
          as="style"
          href={FONTS_HREF}
          data-site-fonts="deferred"
          suppressHydrationWarning
        />
        <noscript>
          <link rel="stylesheet" href={FONTS_HREF} />
        </noscript>
        {/* HeadContent は同名 meta を dedupe するので、media 付きのペアは直接置く。
            system のときは OS に従い、明示選択時は下の初期化スクリプトが media を
            差し替えて片方だけを有効にする。だからスクリプトより前に置く。 */}
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content={THEME_COLOR.light}
          data-scheme="light"
          suppressHydrationWarning
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content={THEME_COLOR.dark}
          data-scheme="dark"
          suppressHydrationWarning
        />
        <script>{THEME_INIT_SCRIPT}</script>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: DEFERRED_FONTS_SCRIPT }} />
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
