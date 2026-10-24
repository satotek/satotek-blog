import { Bot, Rss } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { trackPageView } from "#/analytics/client";
import { Link as AriaLink, RouterLink, iconButtonClass } from "#/components/ui";

import { SiteLogo } from "./SiteLogo";
import { SiteNav } from "./SiteNav";
import { ThemeToggle } from "./ThemeToggle";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[oklch(from_var(--bg)_l_c_h_/_80%)] backdrop-blur-[8px] backdrop-saturate-[180%]">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3.5 px-4 pb-3 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <SiteLogo />
            {/* ドックと同じガラスの入れ物にまとめ、下のドックと並んだときに同じ素材に見せる。 */}
            <div className="site-tools glass">
              <UtilityLinks />
              <ThemeToggle className="inline-flex" />
            </div>
          </div>
          {/* 選択中タイルの光彩はバーの外へにじむので、overflow で切る入れ物に入れない。 */}
          <div className="hidden sm:block">
            <SiteNav variant="bar" />
          </div>
        </div>
      </header>

      {children}

      <footer className="mx-auto mt-16 max-w-[1120px] border-t border-line px-4 py-8 text-[0.85rem] text-muted sm:px-6">
        <small>
          © 2026 <RouterLink to="/profile">nosuke</RouterLink>. All Rights Reserved.
        </small>
      </footer>

      <SiteNav variant="dock" />
    </>
  );
}

function UtilityLinks() {
  return (
    <>
      <AriaLink
        className={`inline-flex ${iconButtonClass}`}
        href="/feed.xml"
        aria-label="RSS フィード"
      >
        <Rss className="size-5" aria-hidden="true" />
      </AriaLink>
      <AriaLink
        className={`inline-flex ${iconButtonClass}`}
        href="/llms.txt"
        aria-label="llms.txt（LLM 向けサイト情報）"
      >
        <Bot className="size-5" aria-hidden="true" />
      </AriaLink>
    </>
  );
}
