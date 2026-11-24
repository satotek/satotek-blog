import { toString } from "mdast-util-to-string";
import GithubSlugger from "github-slugger";
import { valueToEstree } from "estree-util-value-to-estree";
import { visit } from "unist-util-visit";

import type { Heading, Root } from "mdast";

/** mdast-util-to-hast が hProperties を見て、生成する要素の属性にする。 */
type HeadingData = Heading["data"] & { hProperties?: Record<string, unknown> };

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

const TOC_LEVELS = new Set([2, 3, 4]);

/**
 * 見出しに id を振り、目次を `export const toc` として MDX モジュールに埋め込む。
 *
 * id は目次のリンク先であり、HeadingAnchor が出すアンカーの参照先であり、
 * useToc がスクロール追従で見出しを引くための鍵でもある。3者が同じ値を
 * 見る必要があるので、slug はここで1度だけ計算して本文にも書き込む。
 * （以前は rehype-slug が本文側を別に計算していて、github-slugger の
 * 連番まで一致することが暗黙の前提になっていた。）
 *
 * MDX は本文を React コンポーネントへコンパイルするため、目次のような
 * 「本文から導出したデータ」は名前付きエクスポートとして持ち出すしかない。
 */
export function remarkExportToc() {
  return (tree: Root, file: { data: Record<string, unknown> }) => {
    const slugger = new GithubSlugger();
    const toc: TocItem[] = [];

    // 目次に出すのは h2〜h4 だけだが、slug は全ての見出しで進める。
    // 連番（同じ文言が2度出たときの -1, -2）が本文の並び順で決まるため。
    visit(tree, "heading", (node: Heading) => {
      const text = toString(node).trim();
      if (!text) return;

      const id = slugger.slug(text);
      const data: HeadingData = (node.data ??= {});
      data.hProperties = { ...data.hProperties, id };

      if (TOC_LEVELS.has(node.depth)) toc.push({ id, text, level: node.depth });
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
