import {
  Button as AriaButton,
  composeRenderProps,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components";
import { forwardRef } from "react";

export type ButtonVariant = "ghost" | "secondary" | "solid" | "unstyled";
export type ButtonSize = "lg" | "md" | "none" | "sm";

export type ButtonProps = Omit<AriaButtonProps, "className"> & {
  className?: AriaButtonProps["className"];
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const baseClass =
  "touch-manipulation [-webkit-tap-highlight-color:transparent] motion-reduce:transition-none";

const variantClass: Record<ButtonVariant, string> = {
  ghost:
    "border border-transparent bg-transparent text-muted hover:bg-hover hover:text-ink active:scale-[0.96]",
  secondary:
    "border border-line bg-card text-ink hover:border-accent-border hover:bg-accent-soft active:scale-[0.96]",
  solid: "border border-accent bg-accent text-white hover:opacity-90 active:scale-[0.96]",
  unstyled: "",
};

const sizeClass: Record<ButtonSize, string> = {
  lg: "px-6 py-3",
  md: "px-4 py-2",
  none: "",
  sm: "px-3 py-1.5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, size = "none", variant = "unstyled", ...props },
  ref,
) {
  return (
    <AriaButton
      {...props}
      ref={ref}
      className={composeRenderProps(className, (providedClassName) =>
        [baseClass, variantClass[variant], sizeClass[size], providedClassName]
          .filter(Boolean)
          .join(" "),
      )}
    />
  );
});
