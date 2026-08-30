import type { Element, Root as HastRoot } from "hast";
import type { Paragraph, Root } from "mdast";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { SKIP, visit } from "unist-util-visit";

type ImageAttribute = string | number | boolean | string[];

export type ResolvedImage = {
  avifSrcSet?: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
};

export type MarkdownRendererOptions = {
  resolveImage?: (source: string) => ResolvedImage | undefined;
};

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

export function remarkImageAttributes() {
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

export function rehypeImageFigure() {
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

export function transformerCodeChrome() {
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

export function rehypeCodeBlocks() {
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

export function rehypeHeadingLinks() {
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

function positiveInteger(value: unknown) {
  const numeric = typeof value === "string" ? Number(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric) && numeric > 0
    ? numeric
    : undefined;
}

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

export function rehypeResponsiveImages(resolveImage: MarkdownRendererOptions["resolveImage"]) {
  return (tree: HastRoot) => {
    if (!resolveImage) return;

    visit(tree, "element", (node, index, parent) => {
      if (node.type !== "element" || node.tagName !== "img") return;

      const source = node.properties.src;
      if (typeof source !== "string") return;

      const resolved = resolveImage(source);
      if (!resolved) return;

      node.properties.loading = "lazy";
      node.properties.decoding = "async";

      if (resolved.srcSet && resolved.sizes) {
        node.properties.srcSet = resolved.srcSet;
        node.properties.sizes = resolved.sizes;
      }
      if (resolved.srcSet || resolved.avifSrcSet) {
        node.properties["data-full-src"] = source;
      }

      applyIntrinsicSize(node, resolved);

      if ((!resolved.avifSrcSet && !resolved.srcSet) || !resolved.sizes || !parent || index == null)
        return;

      const sources: Element[] = [];
      if (resolved.avifSrcSet) {
        sources.push({
          type: "element",
          tagName: "source",
          properties: {
            type: "image/avif",
            sizes: resolved.sizes,
            srcSet: resolved.avifSrcSet,
          },
          children: [],
        });
      }
      if (resolved.srcSet) {
        sources.push({
          type: "element",
          tagName: "source",
          properties: {
            type: "image/webp",
            sizes: resolved.sizes,
            srcSet: resolved.srcSet,
          },
          children: [],
        });
      }

      parent.children[index] = {
        type: "element",
        tagName: "picture",
        properties: {},
        children: [...sources, node],
      } satisfies Element;
      return SKIP;
    });
  };
}
