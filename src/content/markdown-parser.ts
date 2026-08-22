import { toString } from "mdast-util-to-string";
import type { Element, Root as HastRoot } from "hast";
import { unified } from "unified";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import GithubSlugger from "github-slugger";
import { visit } from "unist-util-visit";

import type { TocItem } from "./types";
import type { Heading, Paragraph, Root } from "mdast";

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
    for (const node of tree.children) {
      if (node.type !== "paragraph") continue;
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
    }
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

const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "figure", "figcaption"],
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), "className"],
  },
};

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkImageAttributes)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeImageFigure)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeSlug)
  .use(rehypeStringify);

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

export function renderMarkdown(markdown: string) {
  const tree = markdownProcessor.parse(markdown);
  const toc = extractToc(tree);
  const html = String(markdownProcessor.processSync(markdown));

  return { html, toc };
}
