import { MDXProvider } from "@mdx-js/react";
import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";

import { CodeBlock } from "./CodeBlock";
import { ArticleImage } from "./ArticleImage";
import { ArticleLink } from "./ArticleLink";
import { HeadingAnchor } from "./HeadingAnchor";

/**
 * Markdown が生成する要素を、そのままコンポーネントへ差し替える。
 * 記事の書き方は素の Markdown のままで、見出しアンカーもコードブロックの
 * 外枠もライトボックスもここで足す。ビルド時に構文を解釈する必要がある
 * ものだけが remark/rehype プラグイン側に残っている。
 */
const components: MDXComponents = {
  pre: CodeBlock,
  img: ArticleImage,
  a: ArticleLink,
  h2: HeadingAnchor("h2"),
  h3: HeadingAnchor("h3"),
  h4: HeadingAnchor("h4"),
};

export function Article({ children }: { children: ReactNode }) {
  return (
    <div className="markdown-body">
      <MDXProvider components={components}>{children}</MDXProvider>
    </div>
  );
}
