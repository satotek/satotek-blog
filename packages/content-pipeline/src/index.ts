import { toString } from "mdast-util-to-string";
import {
  rehypeCodeBlocks,
  rehypeHeadingLinks,
  rehypeImageFigure,
  rehypeResponsiveImages,
  remarkImageAttributes,
  transformerCodeChrome,
  type MarkdownRendererOptions,
} from "./plugins.ts";
import type { Root as HastRoot } from "hast";
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
import rehypeExternalLinks from "rehype-external-links";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import GithubSlugger from "github-slugger";
import { visit } from "unist-util-visit";

import type { Heading, Root } from "mdast";
export { remarkExportToc } from "./remark-toc.ts";
export { createMdxPlugins } from "./mdx.ts";
export {
  rehypeCodeBlocks,
  rehypeHeadingLinks,
  rehypeImageFigure,
  rehypeResponsiveImages,
  remarkImageAttributes,
  transformerCodeChrome,
} from "./plugins.ts";
export type { MarkdownRendererOptions, ResolvedImage } from "./plugins.ts";
export {
  MEDIA_VARIANT_FORMATS,
  MEDIA_VARIANT_WIDTHS,
  generateMediaVariants,
  readImageDimensions,
} from "./media.ts";
export type {
  GeneratedMediaVariant,
  GenerateMediaVariantsOptions,
  MediaDimensions,
  MediaVariantFormat,
} from "./media.ts";

export type TocItem = {
  id: string;
  text: string;
  level: number;
};

export type RenderedMarkdown = {
  html: string;
  toc: readonly TocItem[];
};

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

// width/height 属性はレイアウトを固定するためではなく、読み込み前のアスペクト比を
// ブラウザに伝えるために出す。CSS 側の max-width:100% / height:auto が実際の表示を決める。

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
