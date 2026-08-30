import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import { valueToEstree } from "estree-util-value-to-estree";
import { visit } from "unist-util-visit";

import type { Heading, Root } from "mdast";

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

const TOC_LEVELS = new Set([2, 3, 4]);

/**
 * 見出しを集めて `export const toc` として MDX モジュールに埋め込む。
 * rehype-slug と同じ github-slugger を使うので id は本文側と一致する。
 *
 * MDX は本文を React コンポーネントへコンパイルするため、目次のような
 * 「本文から導出したデータ」は名前付きエクスポートとして持ち出すしかない。
 */
export function remarkExportToc() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    const slugger = new GithubSlugger();
    const toc: TocItem[] = [];

    visit(tree, "heading", (node: Heading) => {
      if (!TOC_LEVELS.has(node.depth)) return;
      const text = toString(node).trim();
      if (!text) return;
      toc.push({ id: slugger.slug(text), text, level: node.depth });
    });

    file.data.toc = toc;

    tree.children.unshift({
      type: "mdxjsEsm",
      value: "",
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          body: [
            {
              type: "ExportNamedDeclaration",
              specifiers: [],
              attributes: [],
              source: null,
              declaration: {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [
                  {
                    type: "VariableDeclarator",
                    id: { type: "Identifier", name: "toc" },
                    init: valueToEstree(toc),
                  },
                ],
              },
            },
          ],
        },
      },
    } as never);
  };
}
