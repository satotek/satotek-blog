import { Bot, Menu, Rss } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";

import { trackPageView } from "#/analytics/client";
import { Button, Link as AriaLink, RouterLink, iconButtonClass } from "#/components/ui";
import { categories } from "#/data/navigation";

import { SiteLogo } from "./SiteLogo";
import { ThemeToggle } from "./ThemeToggle";

const MobileMenu = lazy(() =>
  import("./MobileMenu").then(({ MobileMenu: component }) => ({ default: component })),
);

const navLinkClass = (active: boolean, drawer = false) =>
  [
    drawer
      ? "w-full rounded-lg px-3.5 py-3 text-base"
      : "shrink-0 whitespace-nowrap rounded-[7px] px-2 py-[3px] sm:rounded-[9px] sm:px-[11px] sm:py-[5px]",
    "font-semibold no-underline transition-[background,color] duration-150 hover:bg-hover hover:text-ink",
    active ? "bg-accent-soft text-accent" : "text-muted",
  ].join(" ");

export function SiteChrome({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoaded, setDrawerLoaded] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const closeDrawer = () => setDrawerOpen(false);

  // ドロワーはモバイル専用。開いたまま desktop 幅に広がるとトリガーが消えるので閉じる。
  useEffect(() => {
    const media = window.matchMedia("(min-width: 641px)");
    const handleChange = () => {
      if (media.matches) setDrawerOpen(false);
    };
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] backdrop-blur-[8px] backdrop-saturate-[180%]">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3.5 px-4 pb-3 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <SiteLogo />
            <div className="flex items-center gap-2">
              <UtilityLinks className="hidden sm:inline-flex" />
              <ThemeToggle className="hidden sm:inline-flex" />
              <Button
                className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line bg-transparent text-ink transition-[background,border-color] duration-150 hover:border-accent-border hover:bg-accent-soft motion-reduce:transition-none sm:hidden"
                type="button"
                aria-label="メニュー"
                onPress={() => {
                  setDrawerLoaded(true);
                  setDrawerOpen(true);
                }}
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
              {drawerLoaded ? (
                <Suspense fallback={null}>
                  {/* ルート遷移時に React Aria の exit state を次の履歴へ持ち越さない。 */}
                  <MobileMenu key={pathname} isOpen={drawerOpen} onClose={closeDrawer}>
                    <NavigationLinks onNavigate={closeDrawer} drawer />
                    <div className="mt-auto flex items-center justify-center gap-2.5 pt-3.5">
                      <ThemeToggle className="inline-flex" />
                      <UtilityLinks className="inline-flex" />
                    </div>
                  </MobileMenu>
                </Suspense>
              ) : null}
            </div>
          </div>
          <nav className="hidden sm:block" aria-label="グローバルナビ">
            {/* フォーカスリングは要素の外側 5px に描かれる。overflow で切られないよう内側に余白を確保する。 */}
            <div className="-m-1.5 flex flex-nowrap items-center gap-[clamp(0px,0.8vw,4px)] overflow-x-auto p-1.5 text-[clamp(0.8rem,3vw,0.95rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <NavigationLinks onNavigate={closeDrawer} />
            </div>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mx-auto mt-16 max-w-[1120px] border-t border-line px-4 py-8 text-[0.85rem] text-muted sm:px-6">
        <small>
          © 2026 <RouterLink to="/profile">nosuke</RouterLink>. All Rights Reserved.
        </small>
      </footer>
    </>
  );
}

function UtilityLinks({ className }: { className: string }) {
  return (
    <>
      <AriaLink
        className={`${iconButtonClass} ${className}`}
        href="/feed.xml"
        aria-label="RSS フィード"
      >
        <Rss className="size-5" aria-hidden="true" />
      </AriaLink>
      <AriaLink
        className={`${iconButtonClass} ${className}`}
        href="/llms.txt"
        aria-label="llms.txt（LLM 向けサイト情報）"
      >
        <Bot className="size-5" aria-hidden="true" />
      </AriaLink>
    </>
  );
}

function NavigationLinks({
  onNavigate,
  drawer = false,
}: {
  onNavigate: () => void;
  drawer?: boolean;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <>
      <RouterLink className={navLinkClass(pathname === "/", drawer)} to="/" onClick={onNavigate}>
        Home
      </RouterLink>
      <RouterLink
        to="/posts"
        className={navLinkClass(pathname.startsWith("/posts"), drawer)}
        onClick={onNavigate}
      >
        記事
      </RouterLink>
      {/* デスクトップは一覧ページへの入口だけを置き、ドロワーでは各カテゴリを直接並べる。 */}
      {!drawer && (
        <RouterLink
          to="/categories"
          className={navLinkClass(pathname.startsWith("/categories"), drawer)}
          onClick={onNavigate}
        >
          カテゴリ
        </RouterLink>
      )}
      {drawer &&
        categories.map(({ slug, name }) => (
          <RouterLink
            to="/categories/$slug"
            params={{ slug }}
            key={slug}
            className={navLinkClass(
              pathname === `/categories/${slug}` || pathname.startsWith(`/categories/${slug}/`),
              drawer,
            )}
            onClick={onNavigate}
          >
            {name}
          </RouterLink>
        ))}
      <RouterLink
        to="/tags"
        className={navLinkClass(pathname.startsWith("/tags"), drawer)}
        onClick={onNavigate}
      >
        タグ
      </RouterLink>
      <RouterLink
        to="/profile"
        className={navLinkClass(pathname.startsWith("/profile"), drawer)}
        onClick={onNavigate}
      >
        プロフィール
      </RouterLink>
    </>
  );
}
