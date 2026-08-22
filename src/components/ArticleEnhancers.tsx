import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Button as AriaButton, Dialog, Modal, ModalOverlay } from "react-aria-components";

type ArticleContentRef = RefObject<HTMLElement | null>;

const COPY_BUTTON_SIZE = 28;

type CodeCopyTarget = {
  code: string;
  top: number;
};

type SelectedImage = {
  alt: string;
  caption: string;
  src: string;
};

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to the selection-based API when clipboard permissions are unavailable.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) throw new Error("Copy command failed");
  } finally {
    textarea.remove();
  }
}

function CopyButton({ code, top }: { code: string; top: number }) {
  const [copied, setCopied] = useState(false);

  const handlePress = async () => {
    try {
      await copyText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AriaButton
      aria-label={copied ? "コードをコピーしました" : "コードをコピー"}
      className="copy-btn"
      onPress={handlePress}
      style={{ top: `${top}px` }}
      type="button"
    >
      {copied ? (
        <Check aria-hidden="true" className="icon-check" size={16} strokeWidth={2.5} />
      ) : (
        <Copy aria-hidden="true" className="icon-copy" size={16} />
      )}
    </AriaButton>
  );
}

export function CodeCopyButtons({
  containerRef,
  contentKey,
}: {
  containerRef: ArticleContentRef;
  contentKey: string;
}) {
  const [targets, setTargets] = useState<readonly CodeCopyTarget[]>([]);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    const layer = layerRef.current;
    if (!root || !layer) return;

    let animationFrame = 0;
    const measure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const wrapper = layer.parentElement;
        if (!wrapper) return;

        const wrapperRect = wrapper.getBoundingClientRect();
        const nextTargets = Array.from(root.querySelectorAll<HTMLElement>(".code-block"))
          .map((block) => {
            const blockRect = block.getBoundingClientRect();
            // ヘッダーバーの中に垂直中央で収める（バーが無い場合は上端から少し下げる）。
            const barHeight =
              block.querySelector(".code-block__bar")?.getBoundingClientRect().height ?? 0;
            const barOffset = barHeight > 0 ? (barHeight - COPY_BUTTON_SIZE) / 2 : 10;

            return {
              code: block.querySelector("code")?.textContent ?? "",
              top: blockRect.top - wrapperRect.top + barOffset,
            };
          })
          .filter((target) => target.code.length > 0);

        setTargets(nextTargets);
      });
    };

    measure();
    window.addEventListener("resize", measure);
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    resizeObserver?.observe(root);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", measure);
      resizeObserver?.disconnect();
    };
  }, [containerRef, contentKey]);

  return (
    <div ref={layerRef} className="copy-layer">
      {targets.map((target, index) => (
        <CopyButton code={target.code} key={`${contentKey}-${index}`} top={target.top} />
      ))}
    </div>
  );
}

function bestImageSource(image: HTMLImageElement) {
  const fullSource = image.dataset.fullSrc;
  if (fullSource) return fullSource;

  const source = image.closest("picture")?.querySelector<HTMLSourceElement>("source[srcset]");
  if (source) {
    let best = "";
    let bestWidth = -1;

    for (const candidate of source.srcset.split(",")) {
      const [url, width] = candidate.trim().split(/\s+/);
      const numericWidth = Number.parseInt(width ?? "0", 10) || 0;
      if (url && numericWidth >= bestWidth) {
        best = url;
        bestWidth = numericWidth;
      }
    }

    if (best) return best;
  }

  return image.currentSrc || image.src;
}

function imageCaption(image: HTMLImageElement) {
  return (
    image.closest("figure")?.querySelector("figcaption")?.textContent?.trim() || image.alt.trim()
  );
}

export function ImageLightbox({
  containerRef,
  contentKey,
}: {
  containerRef: ArticleContentRef;
  contentKey: string;
}) {
  const [selected, setSelected] = useState<SelectedImage | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const images = Array.from(root.querySelectorAll<HTMLImageElement>("img:not(.profile-avatar)"));
    const cleanups = images.map((image) => {
      const original = {
        ariaLabel: image.getAttribute("aria-label"),
        role: image.getAttribute("role"),
        tabIndex: image.getAttribute("tabindex"),
      };
      const caption = imageCaption(image);
      const label = caption ? `画像を拡大: ${caption}` : "画像を拡大";

      const open = () => {
        setSelected({
          alt: image.alt,
          caption,
          src: bestImageSource(image),
        });
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      };

      image.setAttribute("aria-label", label);
      image.setAttribute("role", "button");
      image.setAttribute("tabindex", "0");
      image.addEventListener("click", open);
      image.addEventListener("keydown", onKeyDown);

      return () => {
        image.removeEventListener("click", open);
        image.removeEventListener("keydown", onKeyDown);
        if (original.ariaLabel === null) image.removeAttribute("aria-label");
        else image.setAttribute("aria-label", original.ariaLabel);
        if (original.role === null) image.removeAttribute("role");
        else image.setAttribute("role", original.role);
        if (original.tabIndex === null) image.removeAttribute("tabindex");
        else image.setAttribute("tabindex", original.tabIndex);
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [containerRef, contentKey]);

  if (!selected) return null;

  return (
    // オーバーレイ（背景）とモーダル（中身）を分けることで、背景クリックで閉じられる。
    <ModalOverlay
      className="lightbox-overlay"
      isDismissable
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) setSelected(null);
      }}
    >
      <Modal className="lightbox-modal">
        <Dialog aria-label="画像の拡大表示" className="lightbox-dialog">
          <figure className="lightbox-figure">
            <img
              alt={selected.alt}
              className="lightbox-img"
              onClick={() => setSelected(null)}
              src={selected.src}
            />
            {selected.caption ? <figcaption>{selected.caption}</figcaption> : null}
          </figure>
          <AriaButton
            aria-label="閉じる"
            className="lightbox-close"
            onPress={() => setSelected(null)}
            type="button"
          >
            <X aria-hidden="true" size={22} />
          </AriaButton>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
