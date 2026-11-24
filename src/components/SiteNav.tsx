import { Link as VoidLink, useNavigation, useRouter } from "@void/react";
import { House, Music, Newspaper, UserRound, type LucideIcon } from "lucide-react";
import { useEffect, type CSSProperties } from "react";

import {
  clearDockTransition,
  dockIndex,
  dockSections,
  prepareDockTransition,
  type DockPath,
} from "#/lib/nav";

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
 * ドックとヘッダーのバー。選択位置は現在のパスから決める。
 * クリック時に進行方向の View Transition 型を付け、styles/transitions.css で
 * タイルと本文のアニメーションを切り替える。
 */
export function SiteNav({ variant, path }: { variant: "dock" | "bar"; path: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const activeIndex = dockIndex(path);

  useEffect(() => {
    if (navigation.state === "idle") {
      clearDockTransition();
      return;
    }
    if (navigation.location) {
      clearDockTransition(navigation.location.pathname);
    }
  }, [navigation.state, navigation.location]);

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
              <VoidLink
                href={to}
                className="site-nav__item"
                data-active={index === activeIndex || undefined}
                aria-current={index === activeIndex ? "page" : undefined}
                data-dock-link=""
                onNavigate={() => {
                  prepareDockTransition(path || router.path, to);
                }}
              >
                <Icon className="site-nav__icon" aria-hidden="true" />
                <span>{labels[to]}</span>
              </VoidLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
