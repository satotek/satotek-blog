import type { HTMLAttributes } from "react";

/**
 * 見出しへのアンカー。rehype-autolink-headings の置き換えで、
 * id は rehype-slug が付けたものをそのまま使う。
 */
export function HeadingAnchor(Tag: "h2" | "h3" | "h4") {
  return function Heading({ children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
    return (
      <Tag {...props}>
        {children}
        {props.id ? (
          <a aria-hidden="true" className="heading-anchor" href={`#${props.id}`} tabIndex={-1}>
            #
          </a>
        ) : null}
      </Tag>
    );
  };
}
