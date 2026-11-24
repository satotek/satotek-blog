// Overlay primitives are re-exported from this boundary so feature components do not need to
// depend on react-aria-components directly. Feature-specific layout and animation stay local.
export {
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
  Sheet,
  SheetBackdrop,
  SheetContent,
  SheetOverlay,
  SheetTrigger,
} from "react-aria-components";
export type {
  DialogProps,
  DialogTriggerProps,
  ModalOverlayProps,
  SheetBackdropProps,
  SheetContentProps,
  SheetOverlayProps,
  SheetProps,
  SheetTriggerProps,
} from "react-aria-components";
