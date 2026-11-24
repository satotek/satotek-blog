import { forwardRef, type ComponentProps } from "react";
import {
  Link as AriaLink,
  composeRenderProps,
  type LinkProps as AriaLinkProps,
} from "react-aria-components";

const baseClass =
  "touch-manipulation [-webkit-tap-highlight-color:transparent] motion-reduce:transition-none";

export type LinkProps = AriaLinkProps;

/** React Aria を基盤にした外部・通常リンク。 */
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

type RouterLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  to: string;
  params?: Record<string, string | number>;
  search?: unknown;
  hash?: string;
};

/**
 * `to="/posts/$slug" params={{ slug }}` を href に展開する内部リンク。
 * ページは全画面遷移なので、クライアント側ルーターは持たない。パスの書き方だけを
 * ルート定義（pages/ の [slug]）に寄せて、リンク先の組み立てを1か所にまとめる。
 */
export const RouterLink = forwardRef<HTMLAnchorElement, RouterLinkProps>(function RouterLink(
  { to, params, search: _search, hash, ...props },
  ref,
) {
  const path = to.replace(/\$(\w+)/g, (_match, name: string) =>
    encodeURIComponent(String(params?.[name] ?? "")),
  );
  return <Link {...props} ref={ref} href={hash ? `${path}#${hash}` : path} />;
});
