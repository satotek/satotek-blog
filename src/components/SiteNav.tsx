import { House, Music, Newspaper, UserRound, type LucideIcon } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import type { CSSProperties } from "react";

import { RouterLink } from "#/components/ui";

type NavItem = {
  to: "/" | "/posts" | "/music" | "/profile";
  label: string;
  /** ドックは1項目 64px。長いラベルはピルからはみ出すので短い表記を使う。 */
  dockLabel?: string;
  icon: LucideIcon;
};

const barItems: NavItem[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/posts", label: "記事", icon: Newspaper },
  { to: "/music", label: "音楽", icon: Music },
  { to: "/profile", label: "プロフィール", icon: UserRound },
];

const dockItems: NavItem[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/posts", label: "記事", icon: Newspaper },
  { to: "/music", label: "音楽", icon: Music },
  { to: "/profile", label: "プロフィール", dockLabel: "自己紹介", icon: UserRound },
];

/** カテゴリとタグは記事一覧の絞り込みなので「記事」の配下として扱う。 */
const sectionPrefixes: Partial<Record<NavItem["to"], readonly string[]>> = {
  "/posts": ["/posts", "/categories", "/tags"],
};

const isActive = (pathname: string, to: NavItem["to"]) =>
  to === "/"
    ? pathname === "/"
    : (sectionPrefixes[to] ?? [to]).some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );

/**
 * グローバルナビ。モバイルは親指が届く画面下のドック、デスクトップはヘッダー内のバー。
 * カテゴリとタグは独立したメニューにせず、記事一覧の絞り込みから辿る。
 */
export function SiteNav({ variant }: { variant: "dock" | "bar" }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const items = variant === "dock" ? dockItems : barItems;
  const activeIndex = items.findIndex(({ to }) => isActive(pathname, to));

  return (
    <nav
      className={`site-nav site-nav--${variant}`}
      aria-label="グローバルナビ"
      style={
        {
          "--nav-count": items.length,
          "--nav-index": Math.max(activeIndex, 0),
        } as CSSProperties
      }
    >
      {/* ドックの項目は等幅なので、ハイライトは番号から位置を出して滑らせる。
          初回描画では値が変わらないので transition は走らず、遷移したときだけ動く。 */}
      {variant === "dock" ? (
        <span
          className="site-nav__indicator"
          data-visible={activeIndex >= 0 || undefined}
          aria-hidden="true"
        />
      ) : null}
      <ul className="site-nav__list">
        {items.map(({ to, label, dockLabel, icon: Icon }) => (
          <li key={to}>
            <RouterLink
              to={to}
              className="site-nav__item"
              data-active={isActive(pathname, to) || undefined}
            >
              <Icon className="site-nav__icon" aria-hidden="true" />
              <span>{variant === "dock" ? (dockLabel ?? label) : label}</span>
            </RouterLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
