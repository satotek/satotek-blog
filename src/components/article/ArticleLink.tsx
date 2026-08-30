import type { AnchorHTMLAttributes } from "react";

const SITE_HOST = "satotek.dev";

function isExternal(href: string | undefined) {
  if (!href) return false;
  try {
    return new URL(href, `https://${SITE_HOST}`).hostname !== SITE_HOST;
  } catch {
    return false;
  }
}

/**
 * 外部リンクだけ別タブで開く。rehype-external-links の置き換えで、
 * 矢印（↗）は CSS の a[target="_blank"]::after が付ける。
 */
export function ArticleLink({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!isExternal(href)) return <a href={href} {...props} />;
  return <a href={href} rel="noopener" target="_blank" {...props} />;
}
