import { HeadContent, Link, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { GA_INITIALIZER, GA_MEASUREMENT_ID } from "#/analytics/client";
import { BlockPuzzle } from "#/components/games/BlockPuzzle";
import { BugHunt } from "#/components/games/BugHunt";
import { NotFound } from "#/components/NotFound";
import { SiteChrome } from "#/components/SiteChrome";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, createSocialMeta } from "#/lib/site";
import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(() => {
  try {
    const theme = localStorage.getItem("theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch {}
})();`;

const FONTS_HREF = "/fonts.css";

const FONTS_LOAD_SCRIPT = `(() => {
  const href = ${JSON.stringify(FONTS_HREF)};
  if (document.querySelector('link[rel="stylesheet"][href="' + href + '"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.media = "print";
  link.onload = () => {
    link.media = "all";
  };
  document.head.appendChild(link);
})();`;

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
      <Link className="text-accent underline underline-offset-2" to="/">
        ← Homeへ戻る
      </Link>
      <div className="mt-8">
        <BlockPuzzle />
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
      <Link className="text-accent underline underline-offset-2" to="/">
        ← Homeへ戻る
      </Link>
      <div className="mt-8">
        <BugHunt />
      </div>
    </NotFound>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `${THEME_INIT_SCRIPT}${FONTS_LOAD_SCRIPT}` }} />
        <noscript>
          <link rel="stylesheet" href={FONTS_HREF} />
        </noscript>
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
