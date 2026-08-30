import { X } from "lucide-react";
import { useState, type ImgHTMLAttributes } from "react";

import { Button, Dialog, Modal, ModalOverlay } from "#/components/ui";

type ArticleImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  "data-full-src"?: string;
};

/**
 * 本文の画像。クリックで原寸を開く。
 *
 * 以前は本文が HTML 文字列だったため、画像の矩形を測って透明ボタンを重ねていた。
 * MDX では画像そのものがコンポーネントなので、包むだけで済む。測定も
 * ResizeObserver も要らず、React が本文を貼り直しても壊れない。
 */
export function ArticleImage({ "data-full-src": fullSrc, ...props }: ArticleImageProps) {
  const [open, setOpen] = useState(false);
  const caption = props.alt?.trim() ?? "";

  // プロフィール画像など、本文以外の img は拡大しない。
  if (props.className?.includes("profile-avatar")) return <img {...props} alt={props.alt ?? ""} />;

  return (
    <>
      <Button
        aria-label={caption ? `画像を拡大: ${caption}` : "画像を拡大"}
        className="lightbox-trigger"
        onPress={() => setOpen(true)}
        type="button"
      >
        <img {...props} alt={props.alt ?? ""} />
      </Button>

      {open ? (
        <ModalOverlay
          className="lightbox-overlay"
          isDismissable
          isOpen
          onOpenChange={(next) => {
            if (!next) setOpen(false);
          }}
        >
          <Modal className="lightbox-modal">
            <Dialog aria-label="画像の拡大表示" className="lightbox-dialog">
              <figure className="lightbox-figure">
                <img alt={props.alt ?? ""} className="lightbox-img" src={fullSrc ?? props.src} />
                {caption ? <figcaption>{caption}</figcaption> : null}
              </figure>
              <Button
                aria-label="閉じる"
                className="lightbox-close"
                onPress={() => setOpen(false)}
                type="button"
              >
                <X aria-hidden="true" size={22} />
              </Button>
            </Dialog>
          </Modal>
        </ModalOverlay>
      ) : null}
    </>
  );
}
