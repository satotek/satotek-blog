import { AlignLeft, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { Button, Link as AriaLink } from "#/components/ui";
import type { TocState } from "#/components/article/useToc";

function scrollableAncestor(from: HTMLElement) {
  for (let node = from.parentElement; node; node = node.parentElement) {
    if (node.scrollHeight > node.clientHeight + 1) {
      const overflowY = getComputedStyle(node).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") return node;
    }
    if (node.classList.contains("toc")) break;
  }
  return null;
}

export function TableOfContents({ toc }: { toc: TocState }) {
  const { activeId, isOpen, items, onToggle } = toc;
  const listId = `toc-${useId().replace(/:/g, "")}`;
  const navRef = useRef<HTMLElement>(null);

  // 目次自体がスクロールする高さのとき、アクティブ項目を枠内に保つ。
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || !activeId) return;

    const scroller = scrollableAncestor(nav);
    if (!scroller) return;

    const link = nav.querySelector<HTMLElement>(`[href="#${CSS.escape(activeId)}"]`);
    if (!link) return;

    // offsetParent に依存しないよう、実際の描画位置の差分で寄せる。
    const linkRect = link.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();

    if (linkRect.top < scrollerRect.top) {
      scroller.scrollTop += linkRect.top - scrollerRect.top - 16;
    } else if (linkRect.bottom > scrollerRect.bottom) {
      scroller.scrollTop += linkRect.bottom - scrollerRect.bottom + 16;
    }
  }, [activeId]);

  return (
    <div className="toc-wrapper">
      <Button
        aria-controls={listId}
        aria-expanded={isOpen}
        className="toc-toggle"
        onPress={onToggle}
        type="button"
      >
        <AlignLeft aria-hidden="true" className="size-4" />
        <span>目次</span>
        <ChevronDown
          aria-hidden="true"
          className={`toc-chevron size-3.5 ${isOpen ? "" : "toc-chevron--closed"}`}
        />
      </Button>

      {isOpen && (
        <nav aria-label="目次" className="toc-nav" id={listId} ref={navRef}>
          <ol className="toc-list">
            {items.map((item) => (
              <li data-level={item.level} key={item.id}>
                <AriaLink
                  aria-current={activeId === item.id ? "location" : undefined}
                  className={activeId === item.id ? "is-active" : undefined}
                  href={`#${item.id}`}
                >
                  {item.text}
                </AriaLink>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </div>
  );
}
