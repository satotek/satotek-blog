import { toString } from "mdast-util-to-string";
import type { Element, Root as HastRoot } from "hast";
import { unified } from "unified";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import {
  transformerMetaHighlight,
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
} from "@shikijs/transformers";
import { createBundledHighlighter } from "@shikijs/core";
import { createOnigurumaEngine } from "@shikijs/engine-oniguruma";
import { bundledLanguages, type BundledLanguage } from "shiki/langs";
import { bundledThemes } from "shiki/themes";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import GithubSlugger from "github-slugger";
import { visit } from "unist-util-visit";

import type { Heading, Paragraph, Root } from "mdast";
export { MEDIA_VARIANT_WIDTHS, generateMediaVariants, readImageDimensions } from "./media";
export type { GeneratedMediaVariant, GenerateMediaVariantsOptions, MediaDimensions } from "./media";

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

export type RenderedMarkdown = {
  html: string;
  toc: readonly TocItem[];
};

type ImageAttribute = string | number | boolean | string[];

function parseImageAttributes(raw: string) {
  const attributes: Record<string, ImageAttribute> = {};
  const classes: string[] = [];
  const attributePattern = /([.#]?[\w-]+)(?:=("[^"]*"|'[^']*'|\S+))?/g;

  for (const match of raw.matchAll(attributePattern)) {
    const key = match[1];
    if (!key) continue;

    let value = match[2];
    if (value && (value.startsWith('"') || value.startsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key.startsWith(".")) {
      classes.push(key.slice(1));
    } else if (key.startsWith("#")) {
      attributes.id = key.slice(1);
    } else if (key === "width" || key === "height") {
      attributes[key] = value ? Number(value) || value : true;
    }
  }

  if (classes.length > 0) attributes.className = classes;
  return attributes;
}

function remarkImageAttributes() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node) => {
      const paragraph = node as Paragraph;
      for (let index = 0; index < paragraph.children.length - 1; index += 1) {
        const image = paragraph.children[index];
        const suffix = paragraph.children[index + 1];
        if (image?.type !== "image" || suffix?.type !== "text") continue;

        const match = /^\s*\{([^}]*)\}/.exec(suffix.value);
        if (!match) continue;

        image.data ??= {};
        image.data.hProperties = parseImageAttributes(match[1] ?? {});
        suffix.value = suffix.value.slice(match[0].length);
        if (suffix.value.length === 0) paragraph.children.splice(index + 1, 1);
      }
    });
  };
}

function rehypeImageFigure() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.type !== "element" || node.tagName !== "p" || !parent || index == null) return;

      const children = node.children.filter(
        (child) => !(child.type === "text" && child.value.trim() === ""),
      );
      if (children.length !== 1) return;

      const image = children[0];
      if (!image || image.type !== "element" || image.tagName !== "img") return;

      const title = image.properties?.title;
      if (typeof title !== "string" || title.length === 0) return;

      delete image.properties.title;
      parent.children[index] = {
        type: "element",
        tagName: "figure",
        properties: {},
        children: [
          image,
          {
            type: "element",
            tagName: "figcaption",
            properties: {},
            children: [{ type: "text", value: title }],
          },
        ],
      } satisfies Element;
    });
  };
}

function transformerCodeChrome() {
  return {
    name: "code-chrome",
    pre(this: { options?: { lang?: string; meta?: { __raw?: string } } }, node: Element) {
      const raw = this.options?.meta?.__raw;
      const title = raw?.match(/title=("([^"]*)"|'([^']*)'|(\S+))/);
      const value = title?.[2] ?? title?.[3] ?? title?.[4];
      if (value) node.properties["data-title"] = value;

      const lang = this.options?.lang;
      if (lang && lang !== "text") node.properties["data-lang"] = lang;

      // テーマの背景色は捨てて、サイト側の面色（--code-surface）で塗る。
      const style = node.properties.style;
      if (typeof style === "string") {
        node.properties.style = style
          .replace(/(?:^|;)\s*background-color:[^;]*/g, "")
          .replace(/(?:^|;)\s*--shiki-(?:light|dark)-bg:[^;]*/g, "")
          .replace(/^;+/, "");
      }
    },
  };
}

function rehypeCodeBlocks() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.type !== "element" || node.tagName !== "pre" || !parent || index == null) return;

      const title = node.properties["data-title"];
      const lang = node.properties["data-lang"];
      const name = typeof title === "string" ? title : typeof lang === "string" ? lang : "";

      parent.children[index] = {
        type: "element",
        tagName: "div",
        properties: { className: ["code-block"] },
        children: [
          {
            type: "element",
            tagName: "div",
            properties: { className: ["code-block__bar"] },
            children: [
              {
                type: "element",
                tagName: "span",
                properties: { className: ["code-block__name"] },
                children: name ? [{ type: "text", value: name }] : [],
              },
            ],
          },
          node,
        ],
      } satisfies Element;
    });
  };
}

function rehypeHeadingLinks() {
  return rehypeAutolinkHeadings({
    behavior: "append",
    properties: {
      ariaHidden: "true",
      className: ["heading-anchor"],
      tabIndex: -1,
    },
    content: { type: "text", value: "#" } as const,
  });
}

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "figure", "figcaption"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "ariaHidden", "className"],
    a: [...(defaultSchema.attributes?.a ?? []), "className", "rel", "target"],
    pre: [...(defaultSchema.attributes?.pre ?? []), "dataTitle"],
  },
};

function extractToc(tree: Root): TocItem[] {
  const slugger = new GithubSlugger();
  const toc: TocItem[] = [];

  visit(tree, "heading", (node) => {
    const heading = node as Heading;
    const text = toString(heading).trim();
    if (!text) return;

    const id = slugger.slug(text);
    if (heading.depth >= 2 && heading.depth <= 4) {
      toc.push({ id, text, level: heading.depth });
    }
  });

  return toc;
}

type OnigurumaWasm = Parameters<typeof createOnigurumaEngine>[0];

export type ResolvedImage = {
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
};

export type MarkdownRendererOptions = {
  resolveImage?: (source: string) => ResolvedImage | undefined;
};

function positiveInteger(value: unknown) {
  const numeric = typeof value === "string" ? Number(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric) && numeric > 0
    ? numeric
    : undefined;
}

// width/height 属性はレイアウトを固定するためではなく、読み込み前のアスペクト比を
// ブラウザに伝えるために出す。CSS 側の max-width:100% / height:auto が実際の表示を決める。
function applyIntrinsicSize(node: Element, resolved: ResolvedImage) {
  const intrinsicWidth = positiveInteger(resolved.width);
  const intrinsicHeight = positiveInteger(resolved.height);
  if (!intrinsicWidth || !intrinsicHeight) return;

  const authoredWidth = positiveInteger(node.properties.width);
  const authoredHeight = positiveInteger(node.properties.height);
  if (authoredWidth && authoredHeight) return;

  const ratio = intrinsicHeight / intrinsicWidth;
  if (authoredWidth) {
    node.properties.height = Math.round(authoredWidth * ratio);
    return;
  }
  if (authoredHeight) {
    node.properties.width = Math.round(authoredHeight / ratio);
    return;
  }

  node.properties.width = intrinsicWidth;
  node.properties.height = intrinsicHeight;
}

function rehypeResponsiveImages(resolveImage: MarkdownRendererOptions["resolveImage"]) {
  return (tree: HastRoot) => {
    if (!resolveImage) return;

    visit(tree, "element", (node) => {
      if (node.type !== "element" || node.tagName !== "img") return;

      const source = node.properties.src;
      if (typeof source !== "string") return;

      const resolved = resolveImage(source);
      if (!resolved) return;

      if (resolved.srcSet && resolved.sizes) {
        node.properties.srcSet = resolved.srcSet;
        node.properties.sizes = resolved.sizes;
        node.properties.loading = "lazy";
        node.properties.decoding = "async";
        node.properties["data-full-src"] = source;
      }

      applyIntrinsicSize(node, resolved);
    });
  };
}

export function createMarkdownRenderer(
  onigWasm: OnigurumaWasm,
  options: MarkdownRendererOptions = {},
) {
  const shikiLanguages = Object.keys(bundledLanguages) as BundledLanguage[];
  const createShikiHighlighter = createBundledHighlighter({
    engine: () => createOnigurumaEngine(onigWasm),
    langs: bundledLanguages,
    themes: bundledThemes,
  });
  let shikiHighlighterPromise: ReturnType<typeof createShikiHighlighter> | undefined;

  function rehypeShiki(options: Parameters<typeof rehypeShikiFromHighlighter>[1]) {
    return async (tree: HastRoot) => {
      shikiHighlighterPromise ??= createShikiHighlighter({
        langs: shikiLanguages,
        themes: ["vitesse-light", "vitesse-dark"],
      });

      const highlighter = await shikiHighlighterPromise;
      const transform = rehypeShikiFromHighlighter(highlighter, options) as unknown as (
        currentTree: HastRoot,
      ) => void | Promise<void>;
      await transform(tree);
    };
  }

  const markdownProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkImageAttributes)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeImageFigure)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeResponsiveImages, options.resolveImage)
    .use(rehypeSlug)
    .use(rehypeHeadingLinks)
    .use(rehypeExternalLinks, {
      rel: ["noopener"],
      target: "_blank",
    })
    .use(rehypeShiki, {
      defaultColor: "light-dark()",
      defaultLanguage: "text",
      fallbackLanguage: "text",
      themes: { dark: "vitesse-dark", light: "vitesse-light" },
      transformers: [
        transformerNotationDiff(),
        transformerNotationHighlight(),
        transformerNotationFocus(),
        transformerMetaHighlight(),
        transformerCodeChrome(),
      ],
    })
    .use(rehypeCodeBlocks)
    .use(rehypeStringify);

  return {
    async renderMarkdown(markdown: string) {
      const tree = markdownProcessor.parse(markdown);
      const toc = extractToc(tree);
      const html = String(await markdownProcessor.process(markdown));

      return { html, toc } satisfies RenderedMarkdown;
    },
  };
}
