import { Link as VoidLink } from "@void/react";
import type { AnchorHTMLAttributes, ComponentProps } from "react";
import type { Href } from "void/routes";

const SITE_HOST = "satotek.dev";

function isExternal(href: string | undefined) {
  if (!href) return false;
  try {
    return new URL(href, `https://${SITE_HOST}`).hostname !== SITE_HOST;
  } catch {
    return false;
  }
}

function isNonPageAsset(href: string | undefined) {
  if (!href || href.startsWith("#")) return false;
  try {
    const { pathname } = new URL(href, `https://${SITE_HOST}`);
    return /\.[a-z0-9]+$/i.test(pathname);
  } catch {
    return false;
  }
}

/**
 * 外部リンクだけ別タブで開く。rehype-external-links の置き換えで、
 * 矢印（↗）は CSS の a[target="_blank"]::after が付ける。
 * サイト内のページ遷移は Void Router の `<Link>` に乗せる。
 */
export function ArticleLink({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (isExternal(href)) {
    return <a href={href} rel="noopener" target="_blank" {...props} />;
  }
  if (!href || isNonPageAsset(href)) {
    return <a href={href} {...props} />;
  }
  // VoidLink の型は method !== "GET" 用の button 属性と交差するため、GET 用の <a> 属性を明示する。
  return (
    <VoidLink {...(props as Omit<ComponentProps<typeof VoidLink>, "href">)} href={href as Href} />
  );
}
