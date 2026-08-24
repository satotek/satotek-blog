import { composeRenderProps } from "react-aria-components";
import { forwardRef, type ReactNode } from "react";

import { Button, type ButtonProps } from "./Button";

/** ヘッダーやドロワーで使う丸型アイコンボタンの共通クラス。 */
export const iconButtonClass =
  "h-[38px] w-[38px] items-center justify-center rounded-full border border-line bg-transparent text-muted no-underline transition-[background,border-color,color,transform] duration-200 [-webkit-tap-highlight-color:transparent] hover:border-accent-border hover:bg-accent-soft hover:text-ink active:scale-[0.92] motion-reduce:transition-none";

export type IconButtonProps = Omit<ButtonProps, "aria-label" | "children" | "size" | "variant"> & {
  "aria-label": string;
  children?: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, ...props },
  ref,
) {
  return (
    <Button
      {...props}
      className={composeRenderProps(className, (providedClassName) =>
        ["inline-flex", iconButtonClass, providedClassName].filter(Boolean).join(" "),
      )}
      ref={ref}
      size="none"
      type={props.type ?? "button"}
      variant="unstyled"
    />
  );
});
