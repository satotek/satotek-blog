import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button, Dialog, Modal, ModalOverlay } from "#/components/ui";

export function MobileMenu({
  children,
  isOpen,
  onClose,
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <ModalOverlay
      className="drawer-overlay"
      isDismissable
      isOpen={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Modal className="drawer-panel">
        <Dialog aria-label="メニュー" className="drawer-dialog" id="site-drawer">
          <Button
            className="mb-1 inline-flex h-9 w-9 items-center justify-center self-end rounded-lg border-0 bg-transparent text-muted hover:bg-hover hover:text-ink"
            type="button"
            aria-label="メニューを閉じる"
            onPress={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </Button>
          {children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
