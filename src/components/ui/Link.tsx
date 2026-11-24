import { Link as VoidLink } from "@void/react";
import { forwardRef, type ComponentProps } from "react";
import {
  Link as AriaLink,
  composeRenderProps,
  type LinkProps as AriaLinkProps,
} from "react-aria-components";
import type { Href } from "void/routes";

import { clearDockTransition } from "#/lib/nav";
import { preloadArticle } from "#/lib/posts/article-modules";

const baseClass =
  "touch-manipulation [-webkit-tap-highlight-color:transparent] motion-reduce:transition-none";

export type LinkProps = AriaLinkProps;

/**
 * React Aria を基盤にした外部・非ページ用のリンク。
 * `/feed.xml` や `/llms.txt` のような静的ファイルや、意図的にフルロードさせたいリンクで使う。
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { className, ...props },
  ref,
) {
  return (
    <AriaLink
      {...props}
      ref={ref}
      className={composeRenderProps(className, (providedClassName) =>
        [baseClass, providedClassName].filter(Boolean).join(" "),
      )}
    />
  );
});

// 記事の先読みに使うので、呼び出し側からは上書きさせない。
type RouterLinkProps = Omit<
  ComponentProps<typeof VoidLink>,
  "href" | "onPointerEnter" | "onFocus" | "onTouchStart"
> & {
  to: string;
  params?: Record<string, string | number>;
  search?: unknown;
  hash?: string;
};

/**
 * `to="/posts/$slug" params={{ slug }}` を Void Router の `<Link>` へ渡す内部リンク。
 * パスの書き方だけをルート定義（pages/ の [slug]）に寄せつつ、サイト内はクライアント遷移にする。
 */
export function RouterLink({
  to,
  params,
  search: _search,
  hash,
  className,
  onNavigate,
  ...props
}: RouterLinkProps) {
  const path = to.replace(/\$(\w+)/g, (_match, name: string) =>
    encodeURIComponent(String(params?.[name] ?? "")),
  );
  const href = (hash ? `${path}#${hash}` : path) as Href;
  // Void の prefetch と同じきっかけで、記事本文のチャンクも先に取りに行く。
  const articleSlug = to === "/posts/$slug" ? String(params?.slug ?? "") : "";
  const preload = articleSlug ? () => preloadArticle(articleSlug) : undefined;

  return (
    <VoidLink
      {...props}
      href={href}
      className={[baseClass, className].filter(Boolean).join(" ")}
      onPointerEnter={preload}
      onFocus={preload}
      onTouchStart={preload}
      onNavigate={(event) => {
        clearDockTransition();
        onNavigate?.(event);
      }}
    />
  );
}
