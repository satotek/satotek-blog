declare module "*.mdx" {
  import type { MDXProps } from "mdx/types";

  import type { PostFrontmatter, TocItem } from "#/lib/posts/types";

  // remark-mdx-frontmatter と remarkExportToc が名前付きエクスポートとして埋め込む。
  export const frontmatter: PostFrontmatter;
  export const toc: readonly TocItem[];

  export default function MDXContent(props: MDXProps): JSX.Element;
}
