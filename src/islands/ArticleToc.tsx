import { useLayoutEffect, useRef } from "react";

import { MobileTableOfContents, TableOfContents } from "#/components/article/TableOfContents";
import { useToc } from "#/components/article/useToc";
import type { TocItem } from "#/core/posts/types";

/**
 * 記事の目次。見出しの追従と開閉に JS が要るので island にする。
 * 本文は island の外（静的 HTML）にあるため、ref は id で本文を指す。
 * デスクトップの開閉は周りのグリッド幅も変えるので、外側の要素のクラスをここから切り替える。
 */
export default function ArticleTocIsland({
  items,
  variant,
}: {
  items: readonly TocItem[];
  variant: "desktop" | "mobile";
}) {
  const contentRef = useRef<HTMLElement | null>(null);
  // useToc の見出し追従（useEffect）より先に本文を掴んでおく。
  useLayoutEffect(() => {
    contentRef.current = document.getElementById("post-body");
  }, []);
  const toc = useToc(contentRef, items);

  useLayoutEffect(() => {
    if (variant !== "desktop") return;
    document
      .querySelector(".post-layout")
      ?.classList.toggle("post-layout--toc-closed", !toc.isDesktopOpen);
  }, [variant, toc.isDesktopOpen]);

  return variant === "desktop" ? (
    <TableOfContents toc={toc} />
  ) : (
    <MobileTableOfContents toc={toc} />
  );
}
