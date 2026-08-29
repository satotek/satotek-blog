import { useEffect, useState, type RefObject } from "react";

import type { TocItem } from "#/content/types";

const TOC_MIN = 3;
const TOC_STATE_KEY = "toc-state";
const READING_LINE = 120;

// 見出しが無いときに毎回 [] を作ると、参照が変わるだけで effect が回り直す。
const NO_ITEMS: readonly TocItem[] = [];

export type TocState = {
  activeId?: string;
  hasToc: boolean;
  isOpen: boolean;
  items: readonly TocItem[];
  onToggle: () => void;
};

function useActiveHeading(contentRef: RefObject<HTMLElement | null>, items: readonly TocItem[]) {
  const [activeId, setActiveId] = useState<string | undefined>(items[0]?.id);

  useEffect(() => {
    setActiveId(items[0]?.id);
    if (items.length === 0) return;

    // 記事本文は再レンダリングで DOM ごと差し替わることがある。見出しの参照を
    // 持ち回ると detached なノードを測り続けて追従が止まるので、毎回引き直す。
    const readHeadings = () => {
      const root = contentRef.current;
      if (!root) return [];
      return items
        .map((item) => root.querySelector<HTMLElement>(`#${CSS.escape(item.id)}`))
        .filter((heading): heading is HTMLElement => heading !== null);
    };

    // 「読んでいる行」を固定ヘッダーの少し下に置き、そこを最後に通過した見出しを
    // 採用する。帯に見出しが無い時間があっても答えが必ず出る。
    const update = () => {
      const headings = readHeadings();
      if (headings.length === 0) return;

      const reachedBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (reachedBottom) {
        setActiveId(headings.at(-1)?.id);
        return;
      }

      let current = headings[0];
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > READING_LINE) break;
        current = heading;
      }
      setActiveId(current?.id);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [contentRef, items]);

  return activeId;
}

/**
 * 目次の状態をまとめて持つ。開閉はモバイルとデスクトップで同じ目次を 2 箇所に
 * 描くため共有が要る。DOM 上の位置が違うので CSS だけでは出し分けられない。
 */
export function useToc(
  contentRef: RefObject<HTMLElement | null>,
  items: readonly TocItem[],
): TocState {
  const hasToc = items.length >= TOC_MIN;
  const tocItems = hasToc ? items : NO_ITEMS;
  const activeId = useActiveHeading(contentRef, tocItems);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    try {
      setIsOpen(localStorage.getItem(TOC_STATE_KEY) !== "close");
    } catch {}
  }, []);

  const onToggle = () => {
    setIsOpen((open) => {
      const next = !open;
      try {
        localStorage.setItem(TOC_STATE_KEY, next ? "open" : "close");
      } catch {}
      return next;
    });
  };

  return { activeId, hasToc, isOpen, items: tocItems, onToggle };
}
