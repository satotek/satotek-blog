import { House, Music, Newspaper, UserRound, type LucideIcon } from "lucide-react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";

import { RouterLink } from "#/components/ui";
import {
  isDockTransitionRunning,
  isPlainLeftClick,
  prefersReducedMotion,
  transitionDockPage,
} from "#/lib/dock-transition";
import { dockDirection, dockIndex, dockSections, type DockPath } from "#/lib/nav";

type NavItem = {
  to: DockPath;
  label: string;
  icon: LucideIcon;
};

const icons: Record<DockPath, LucideIcon> = {
  "/": House,
  "/posts": Newspaper,
  "/music": Music,
  "/profile": UserRound,
};

const labels: Record<DockPath, string> = {
  "/": "Home",
  "/posts": "Articles",
  "/music": "Music",
  "/profile": "Profile",
};

const items: NavItem[] = dockSections.map(({ to }) => ({
  to,
  label: labels[to],
  icon: icons[to],
}));

/**
 * グローバルナビ。モバイルは親指が届く画面下のドック、デスクトップはヘッダー内のバー。
 * カテゴリとタグは独立したメニューにせず、記事一覧の絞り込みから辿る。
 */
export function SiteNav({ variant }: { variant: "dock" | "bar" }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const activeIndex = dockIndex(pathname);
  // ページを出している間にタイルを滑らせる。遷移が終われば URL 側の位置に戻す。
  const shownIndex = pendingIndex ?? activeIndex;

  const moveTo =
    (to: DockPath) =>
    (event: {
      button: number;
      metaKey: boolean;
      altKey: boolean;
      ctrlKey: boolean;
      shiftKey: boolean;
      preventDefault: () => void;
    }) => {
      if (!isPlainLeftClick(event) || prefersReducedMotion()) return;
      const direction = dockDirection(pathname, to);
      if (direction === null || pathname === to) return;
      event.preventDefault();
      if (isDockTransitionRunning()) return;

      setPendingIndex(dockIndex(to));
      void transitionDockPage(direction, () =>
        router.navigate({ to, viewTransition: false }),
      ).finally(() => setPendingIndex(null));
    };

  return (
    <nav
      className={`site-nav site-nav--${variant} glass`}
      aria-label="グローバルナビ"
      style={
        {
          "--nav-count": items.length,
          "--nav-index": Math.max(shownIndex, 0),
        } as CSSProperties
      }
    >
      {/* ドックの項目は等幅なので、ハイライトは番号から位置を出して滑らせる。
          初回描画では値が変わらないので transition は走らず、遷移したときだけ動く。 */}
      {variant === "dock" ? (
        <span
          className="site-nav__indicator"
          data-visible={shownIndex >= 0 || undefined}
          aria-hidden="true"
        />
      ) : null}
      <ul className="site-nav__list">
        {items.map(({ to, label, icon: Icon }, index) => (
          <li key={to}>
            <RouterLink
              to={to}
              className="site-nav__item"
              data-active={index === shownIndex || undefined}
              onClick={moveTo(to)}
            >
              <Icon className="site-nav__icon" aria-hidden="true" />
              <span>{label}</span>
            </RouterLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
