import type { PluggableList } from "unified";

import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

import { rehypeCodeBlocks } from "./highlight.ts";
import { rehypeImageFigure, rehypeResponsiveImages, type ImageResolverOptions } from "./plugins.ts";
import { remarkExportToc } from "./remark-toc.ts";

/**
 * MDX 用のプラグイン構成。
 *
 * ここに置くのは「ビルド時に構文を解釈しないと扱えないもの」だけに絞る。
 * 見出しアンカーやコードブロックの外枠、ライトボックスのような
 * 出来上がった要素への肉付けは、MDX の components マップ側で行う。
 */
export function createMdxPlugins(options: ImageResolverOptions = {}): {
  remarkPlugins: PluggableList;
  rehypePlugins: PluggableList;
} {
  return {
    remarkPlugins: [
      remarkGfm,
      remarkFrontmatter,
      [remarkMdxFrontmatter, { name: "frontmatter" }],
      remarkExportToc,
    ],
    rehypePlugins: [
      rehypeImageFigure,
      [rehypeResponsiveImages, options.resolveImage],
      rehypeSlug,
      rehypeCodeBlocks,
    ],
  };
}
