import { createLink } from "@tanstack/react-router";
import {
  Link as AriaLink,
  composeRenderProps,
  type LinkProps as AriaLinkProps,
} from "react-aria-components";
import { forwardRef } from "react";

const baseClass =
  "touch-manipulation [-webkit-tap-highlight-color:transparent] motion-reduce:transition-none";

export type LinkProps = AriaLinkProps;

/** React Ariaを基盤にした外部・通常リンク。 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { className, ...props },
  ref,
) {
  return (
    <AriaLink
      {...props}
      ref={ref}
      className={composeRenderProps(className, (providedClassName) =>
        [baseClass, providedClassName].filter(Boolean).join(" "),
      )}
    />
  );
});

/** TanStack Routerの型安全な遷移とReact Ariaのリンク挙動を組み合わせたリンク。 */
export const RouterLink = createLink(Link);
