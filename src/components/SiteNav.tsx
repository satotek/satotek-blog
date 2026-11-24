import { House, Music, Newspaper, UserRound, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

import { dockIndex, dockSections, type DockPath } from "#/lib/nav";

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

/**
 * ドックとヘッダーのバー。選択位置はビルド時にパスから決める。
 * タイルの移動は JS ではなく、ページをまたぐ View Transition に任せる
 * （styles/transitions.css でタイルに名前を付け、新旧の位置をブラウザが補間する）。
 */
export function SiteNav({ variant, path }: { variant: "dock" | "bar"; path: string }) {
  const activeIndex = dockIndex(path);

  return (
    <nav
      className={`site-nav site-nav--${variant} glass`}
      aria-label="グローバルナビ"
      style={
        {
          "--nav-count": dockSections.length,
          "--nav-index": Math.max(activeIndex, 0),
        } as CSSProperties
      }
    >
      {variant === "dock" ? (
        <span
          className="site-nav__indicator"
          data-visible={activeIndex >= 0 || undefined}
          aria-hidden="true"
        />
      ) : null}
      <ul className="site-nav__list">
        {dockSections.map(({ to }, index) => {
          const Icon = icons[to];
          return (
            <li key={to}>
              <a
                href={to}
                className="site-nav__item"
                data-active={index === activeIndex || undefined}
                aria-current={index === activeIndex ? "page" : undefined}
                data-dock-link=""
              >
                <Icon className="site-nav__icon" aria-hidden="true" />
                <span>{labels[to]}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
