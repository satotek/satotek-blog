import { AlignLeft, ChevronDown, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button, Dialog, Link as AriaLink, Modal, ModalOverlay } from "#/components/ui";
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
  const { isDesktopOpen, onDesktopToggle } = toc;
  const listId = `toc-${useId().replace(/:/g, "")}`;

  return (
    <div className="toc-wrapper">
      <Button
        aria-controls={listId}
        aria-expanded={isDesktopOpen}
        className="toc-toggle"
        onPress={onDesktopToggle}
        type="button"
      >
        <AlignLeft aria-hidden="true" className="size-4" />
        <span>目次</span>
        <ChevronDown
          aria-hidden="true"
          className={`toc-chevron size-3.5 ${isDesktopOpen ? "" : "toc-chevron--closed"}`}
        />
      </Button>

      {isDesktopOpen && <TocList id={listId} toc={toc} />}
    </div>
  );
}

export function MobileTableOfContents({ toc }: { toc: TocState }) {
  const [isOpen, setIsOpen] = useState(false);
  const instanceId = useId().replace(/:/g, "");
  const dialogId = `toc-mobile-dialog-${instanceId}`;
  const titleId = `toc-mobile-title-${instanceId}`;
  const listId = `toc-mobile-list-${instanceId}`;

  const close = () => setIsOpen(false);

  // モバイルで開いたまま横向き回転やウィンドウ拡大で desktop 幅になったら閉じる。
  // CSSだけで隠すと、再びモバイル幅へ戻ったときに古いシートが突然開く。
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1000px)");
    const handleChange = () => {
      if (media.matches) setIsOpen(false);
    };

    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <>
      <Button
        aria-controls={dialogId}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={isOpen ? "目次を閉じる" : "目次を開く"}
        className="toc-mobile-trigger"
        onPress={() => setIsOpen((open) => !open)}
        type="button"
      >
        <AlignLeft aria-hidden="true" className="size-4" />
      </Button>

      <ModalOverlay
        className="toc-sheet-overlay"
        isDismissable
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <Modal className="toc-sheet">
          <Dialog aria-labelledby={titleId} className="toc-sheet-dialog" id={dialogId}>
            <div className="toc-sheet-header">
              <h2 className="toc-sheet-title" id={titleId}>
                目次
              </h2>
              <Button
                aria-label="目次を閉じる"
                className="toc-sheet-close"
                onPress={close}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </Button>
            </div>
            <div className="toc-sheet-body">
              <TocList id={listId} onNavigate={close} toc={toc} />
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}

function TocList({ id, onNavigate, toc }: { id: string; onNavigate?: () => void; toc: TocState }) {
  const { activeId, items } = toc;
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
    <nav aria-label="目次" className="toc-nav" id={id} ref={navRef}>
      <ol className="toc-list">
        {items.map((item) => (
          <li data-level={item.level} key={item.id}>
            <AriaLink
              aria-current={activeId === item.id ? "location" : undefined}
              className={activeId === item.id ? "is-active" : undefined}
              href={`#${item.id}`}
              onClick={
                onNavigate
                  ? (event) => {
                      // モバイルのシートを閉じるとリンク自身がunmountされるため、
                      // アンカーの既定処理には任せず、先にハッシュを設定する。
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                        return;
                      }
                      event.preventDefault();
                      window.location.hash = item.id;
                      window.requestAnimationFrame(onNavigate);
                    }
                  : undefined
              }
            >
              {item.text}
            </AriaLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
