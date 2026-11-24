import { RouterContext, useShared } from "@void/react";
import { Bot, Rss } from "lucide-react";
import { useContext, type ReactNode } from "react";

import { SiteNav } from "#/components/SiteNav";
import { Link as AriaLink, RouterLink, iconButtonClass } from "#/components/ui";
import Analytics from "../src/islands/Analytics";
import SiteLogo from "../src/islands/SiteLogo";
import ThemeToggle from "../src/islands/ThemeToggle";
import WebMcp from "../src/islands/WebMcp";
import "./styles.css";

/**
 * 全ページ共通のレイアウト。クライアント遷移中もマウントを維持し、
 * ナビの選択位置は Void Router の現在パス（未接続の island ページでは shared）から決める。
 */
export default function Layout({ children }: { children: ReactNode }) {
  const shared = useShared();
  const router = useContext(RouterContext);
  const path = router?.path ?? shared?.path ?? "";

  return (
    <>
      <header className="sticky top-0 z-50 bg-[oklch(from_var(--bg)_l_c_h_/_80%)] backdrop-blur-[8px] backdrop-saturate-[180%]">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3.5 px-4 pb-3 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <SiteLogo />
            <div className="site-tools glass">
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
              <ThemeToggle />
            </div>
          </div>
          <div className="hidden sm:block">
            <SiteNav variant="bar" path={path} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-4 pb-6 pt-2 sm:px-6">{children}</main>

      <footer className="mx-auto mt-16 max-w-[1120px] border-t border-line px-4 py-8 text-[0.85rem] text-muted sm:px-6">
        <small>
          © 2026{" "}
          <RouterLink className="inline-flex min-h-6 min-w-6 items-center" to="/profile">
            nosuke
          </RouterLink>
          . All Rights Reserved.
        </small>
      </footer>

      <SiteNav variant="dock" path={path} />
      <Analytics />
      <WebMcp />
    </>
  );
}
