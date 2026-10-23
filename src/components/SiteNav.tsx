import { House, Newspaper, Shapes, Tag, UserRound, type LucideIcon } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import type { CSSProperties } from "react";

import { RouterLink } from "#/components/ui";

type NavItem = {
  to: "/" | "/posts" | "/categories" | "/tags" | "/profile";
  label: string;
  /** ドックは1項目 64px。長いラベルはピルからはみ出すので短い表記を使う。 */
  dockLabel?: string;
  icon: LucideIcon;
};

const items: NavItem[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/posts", label: "記事", icon: Newspaper },
  { to: "/categories", label: "カテゴリ", icon: Shapes },
  { to: "/tags", label: "タグ", icon: Tag },
  { to: "/profile", label: "プロフィール", dockLabel: "自己紹介", icon: UserRound },
];

const isActive = (pathname: string, to: NavItem["to"]) =>
  to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

/**
 * グローバルナビ。モバイルは親指が届く画面下のドック、デスクトップはヘッダー内のバーとして
 * 同じ項目を描く。どちらを見せるかは CSS のブレークポイントで切り替える。
 */
export function SiteNav({ variant }: { variant: "dock" | "bar" }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
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
