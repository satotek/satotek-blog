import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

import { Button, Dialog, Modal, ModalOverlay } from "#/components/ui";

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

type ImageTrigger = SelectedImage & {
  height: number;
  key: string;
  left: number;
  top: number;
  width: number;
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
    <Button
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
    </Button>
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
  const [triggers, setTriggers] = useState<readonly ImageTrigger[]>([]);
  const [selected, setSelected] = useState<SelectedImage | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const activeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const root = containerRef.current;
    const layer = layerRef.current;
    if (!root || !layer) return undefined;

    setTriggers([]);
    let animationFrame = 0;
    // React は hydration 後の最初の更新で innerHTML を貼り直すため、本文の子ノードが丸ごと差し替わる。
    // 画像を一度だけ配列に控えると、以降は切り離された古いノード（常に 0x0）を測り続けてボタンが出なくなる。
    // そのため測定のたびに引き直し、新しいノードへ購読を張り替える。
    const observed = new Set<HTMLImageElement>();

    const liveImages = () =>
      Array.from(root.querySelectorAll<HTMLImageElement>("img:not(.profile-avatar)"));

    const measure = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const images = liveImages();

        for (const image of observed) {
          if (image.isConnected) continue;
          image.removeEventListener("load", measure);
          resizeObserver?.unobserve(image);
          observed.delete(image);
        }

        for (const image of images) {
          if (observed.has(image)) continue;
          observed.add(image);
          image.addEventListener("load", measure);
          resizeObserver?.observe(image);
        }

        const layerRect = layer.getBoundingClientRect();
        const nextTriggers = images
          .map((image, index) => {
            const imageRect = image.getBoundingClientRect();
            if (imageRect.width <= 0 || imageRect.height <= 0) return null;

            const caption = imageCaption(image);
            return {
              alt: image.alt,
              caption,
              height: imageRect.height,
              // currentSrc は遅延読み込み中に切り替わるため、DOM ボタンの key には使わない。
              // key が変わると、タップ中のボタンが再生成されて入力を取りこぼす。
              key: `${contentKey}-${index}`,
              left: imageRect.left - layerRect.left,
              src: bestImageSource(image),
              top: imageRect.top - layerRect.top,
              width: imageRect.width,
            } satisfies ImageTrigger;
          })
          .filter((trigger): trigger is ImageTrigger => trigger !== null);

        // 遅延読み込みやモバイルのスクロール中に、一瞬だけ画像の寸法が 0 になることがある。
        // その瞬間にボタンを消すと、タップ対象そのものが外れて入力を取りこぼす。
        if (nextTriggers.length > 0 || images.length === 0) setTriggers(nextTriggers);
      });
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    resizeObserver?.observe(root);

    // innerHTML の貼り直しは本文の寸法を変えないので ResizeObserver では拾えない。
    // 子ノードの入れ替わり自体を監視して、新しい画像を測り直す。
    const mutationObserver =
      typeof MutationObserver === "undefined" ? undefined : new MutationObserver(measure);
    mutationObserver?.observe(root, { childList: true, subtree: true });

    measure();
    window.addEventListener("resize", measure);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", measure);
      for (const image of observed) image.removeEventListener("load", measure);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [containerRef, contentKey]);

  useEffect(() => {
    if (selected) {
      wasOpenRef.current = true;
      return undefined;
    }
    if (!wasOpenRef.current) return undefined;

    const trigger = activeTriggerRef.current;
    const animationFrame = window.requestAnimationFrame(() => trigger?.focus());
    wasOpenRef.current = false;
    return () => window.cancelAnimationFrame(animationFrame);
  }, [selected]);

  const close = () => setSelected(null);

  return (
    <>
      <div ref={layerRef} className="lightbox-trigger-layer">
        {triggers.map((trigger) => (
          <Button
            aria-label={trigger.caption ? `画像を拡大: ${trigger.caption}` : "画像を拡大"}
            className="lightbox-trigger"
            key={trigger.key}
            onPress={() =>
              setSelected({
                alt: trigger.alt,
                caption: trigger.caption,
                src: trigger.src,
              })
            }
            onPressStart={(event) => {
              if (event.target instanceof HTMLButtonElement) {
                activeTriggerRef.current = event.target;
              }
            }}
            style={{
              height: `${trigger.height}px`,
              left: `${trigger.left}px`,
              top: `${trigger.top}px`,
              width: `${trigger.width}px`,
            }}
            type="button"
          />
        ))}
      </div>

      {/* オーバーレイ（背景）とモーダル（中身）を分けることで、背景クリックで閉じられる。 */}
      {selected ? (
        <ModalOverlay
          className="lightbox-overlay"
          isDismissable
          isOpen
          onOpenChange={(isOpen) => {
            if (!isOpen) close();
          }}
        >
          <Modal className="lightbox-modal">
            <Dialog aria-label="画像の拡大表示" className="lightbox-dialog">
              <figure className="lightbox-figure">
                <img alt={selected.alt} className="lightbox-img" src={selected.src} />
                {selected.caption ? <figcaption>{selected.caption}</figcaption> : null}
              </figure>
              <Button aria-label="閉じる" className="lightbox-close" onPress={close} type="button">
                <X aria-hidden="true" size={22} />
              </Button>
            </Dialog>
          </Modal>
        </ModalOverlay>
      ) : null}
    </>
  );
}
