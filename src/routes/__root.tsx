import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { lazy, Suspense, type ReactNode } from "react";

import { GA_INITIALIZER, GA_MEASUREMENT_ID } from "#/analytics/client";
import { NotFound } from "#/components/NotFound";
import { SiteChrome } from "#/components/SiteChrome";
import { RouterLink } from "#/components/ui";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, createSocialMeta } from "#/lib/site";
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
    const theme = localStorage.getItem("theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch {}
})();`;

const FONTS_HREF = "/fonts.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_NAME },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "theme-color", content: "#f3ece0" },
      ...createSocialMeta({
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        includeImageDimensions: false,
      }),
    ],
    links: [
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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {GA_MEASUREMENT_ID ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <script dangerouslySetInnerHTML={{ __html: GA_INITIALIZER }} />
          </>
        ) : null}
        <HeadContent />
      </head>
      <body>
        <SiteChrome>
          <main className="mx-auto max-w-[1120px] px-4 pb-6 pt-2 sm:px-6">{children}</main>
        </SiteChrome>
        <Scripts />
      </body>
    </html>
  );
}
