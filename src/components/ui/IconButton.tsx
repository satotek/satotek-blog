import { composeRenderProps } from "react-aria-components";
import { forwardRef, type ReactNode } from "react";

import { Button, type ButtonProps } from "./Button";

/** ヘッダーのガラスの入れ物（.site-tools）に並べるアイコンボタンの共通クラス。
    枠は入れ物が持つので、ボタン自体は枠なしのタイルにする。 */
export const iconButtonClass =
  "h-9 w-9 items-center justify-center rounded-full border-0 bg-transparent text-muted no-underline transition-[background,color,transform] duration-200 [-webkit-tap-highlight-color:transparent] hover:bg-hover hover:text-ink active:scale-[0.92] motion-reduce:transition-none";

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
