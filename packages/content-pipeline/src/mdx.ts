import type { PluggableList } from "unified";

import rehypeShiki from "@shikijs/rehype";
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";

import {
  rehypeImageFigure,
  rehypeResponsiveImages,
  transformerCodeChrome,
  type ImageResolverOptions,
} from "./plugins.ts";
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
      [
        rehypeShiki,
        {
          // light-dark() を直接出すので、CSS 側の上書きも !important も要らない。
          defaultColor: "light-dark()",
          defaultLanguage: "text",
          fallbackLanguage: "text",
          themes: { dark: "github-dark", light: "github-light" },
          transformers: [
            transformerNotationDiff(),
            transformerNotationHighlight(),
            transformerNotationFocus(),
            transformerMetaHighlight(),
            transformerCodeChrome(),
          ],
        },
      ],
    ],
  };
}
