import type { Element, ElementContent, Root as HastRoot, RootContent } from "hast";
import { visit } from "unist-util-visit";

import { createStarryNight } from "@wooorm/starry-night";
import sourceCss from "@wooorm/starry-night/source.css";
import sourceDiff from "@wooorm/starry-night/source.diff";
import sourceGo from "@wooorm/starry-night/source.go";
import sourceJs from "@wooorm/starry-night/source.js";
import sourceJson from "@wooorm/starry-night/source.json";
import sourceNix from "@wooorm/starry-night/source.nix";
import sourcePython from "@wooorm/starry-night/source.python";
import sourceRust from "@wooorm/starry-night/source.rust";
import sourceShell from "@wooorm/starry-night/source.shell";
import sourceToml from "@wooorm/starry-night/source.toml";
import sourceTs from "@wooorm/starry-night/source.ts";
import sourceTsx from "@wooorm/starry-night/source.tsx";
import sourceYaml from "@wooorm/starry-night/source.yaml";
import textHtml from "@wooorm/starry-night/text.html.basic";
import textMd from "@wooorm/starry-night/text.md";

/**
 * 記事で使う文法だけを積む。starry-night は 2,526 個を同梱しているので、
 * 必要になった言語はここへ1行足せば増やせる。未登録の言語はそのまま
 * エスケープ済みの素のテキストとして出る。
 */
const grammars = [
  sourceCss,
  sourceDiff,
  sourceGo,
  sourceJs,
  sourceJson,
  sourceNix,
  sourcePython,
  sourceRust,
  sourceShell,
  sourceToml,
  sourceTs,
  sourceTsx,
  sourceYaml,
  textHtml,
  textMd,
];

// 文法の読み込みは非同期で、しかも1回で足りる。記事ごとに作り直さない。
let starryNight: ReturnType<typeof createStarryNight> | undefined;
function getStarryNight() {
  starryNight ??= createStarryNight(grammars);
  return starryNight;
}

function codeChild(node: Element) {
  return node.children.find(
    (child): child is Element => child.type === "element" && child.tagName === "code",
  );
}

function fenceLanguage(code: Element) {
  const className = code.properties?.className;
  const classes = Array.isArray(className) ? className : [];
  const match = classes.find(
    (value): value is string => typeof value === "string" && value.startsWith("language-"),
  );
  return match?.slice("language-".length);
}

/** ```ts title="src/a.ts" のメタから、ファイル名だけを取り出す。 */
function fenceTitle(code: Element) {
  const meta = (code.data as { meta?: unknown } | undefined)?.meta;
  if (typeof meta !== "string") return undefined;
  const match = /title=("([^"]*)"|'([^']*)'|(\S+))/.exec(meta);
  return match?.[2] ?? match?.[3] ?? match?.[4];
}

function collectText(node: RootContent | Element): string {
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map((child) => collectText(child)).join("");
  return "";
}

function splitNodeByLines(node: ElementContent): ElementContent[][] {
  if (node.type === "text" || node.type === "comment") {
    return node.value.split("\n").map((value) => (value ? [{ ...node, value }] : []));
  }

  if (node.type === "element") {
    return splitChildrenByLines(node.children).map((children) => [{ ...node, children }]);
  }

  return [[node]];
}

function splitChildrenByLines(children: ElementContent[]) {
  const lines: ElementContent[][] = [[]];

  for (const child of children) {
    const childLines = splitNodeByLines(child);
    lines[lines.length - 1].push(...childLines[0]);
    lines.push(...childLines.slice(1));
  }

  return lines;
}

function codeLineBreak(): Element {
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["code-line__break"], ariaHidden: "true" },
    children: [{ type: "text", value: "\n" }],
  };
}

function codeLine(line: ElementContent[]): Element {
  return {
    type: "element",
    tagName: "span",
    properties: { className: ["code-line"], dataLine: true },
    children: [
      {
        type: "element",
        tagName: "span",
        properties: { className: ["code-line__content"] },
        children: line,
      },
    ],
  };
}

function wrapCodeLines(children: ElementContent[]): ElementContent[] {
  const lines = splitChildrenByLines(children);

  return lines.flatMap((line, index): ElementContent[] =>
    index > 0 ? [codeLineBreak(), codeLine(line)] : [codeLine(line)],
  );
}

/**
 * コードフェンスを starry-night でハイライトする。
 *
 * pre と code の要素はそのまま残し、code の中身だけを行単位で差し替える。
 * 色は pl-* クラスが指すだけで、要素に焼き込まれない。
 */
export function rehypeCodeBlocks() {
  return async (tree: HastRoot) => {
    const highlighter = await getStarryNight();

    visit(tree, "element", (node) => {
      if (node.tagName !== "pre") return;

      const code = codeChild(node);
      if (!code) return;

      const title = fenceTitle(code);
      if (title) node.properties.dataTitle = title;

      const language = fenceLanguage(code);
      const scope = language ? highlighter.flagToScope(language) : undefined;
      const source = collectText(code).replace(/\r\n?/g, "\n").trimEnd();

      // highlight() が返すのは Root。中身は要素とテキストだけだが、型の上では
      // doctype なども入りうるので、code に入れられるものだけを通す。
      const highlightedChildren = scope
        ? highlighter
            .highlight(source, scope)
            .children.filter(
              (child): child is ElementContent =>
                child.type === "element" || child.type === "text" || child.type === "comment",
            )
        : [{ type: "text" as const, value: source }];

      code.properties = { ...code.properties, dataLineNumbers: true };
      code.children = wrapCodeLines(highlightedChildren);
    });
  };
}
