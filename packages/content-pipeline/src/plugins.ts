import type { Element, Root as HastRoot } from "hast";
import { visit } from "unist-util-visit";

export type ResolvedImage = {
  /** 配信 URL。原文が相対パスのときはここで絶対 URL に置き換わる。 */
  src?: string;
  avifSrcSet?: string;
  srcSet?: string;
  sizes?: string;
  width?: number;
  height?: number;
};

/**
 * 画像の解決は原文の src と、それが書かれた MDX の絶対パスの両方を要る。
 * `./assets/photo.webp` のような相対パスを解くのに、基準となるファイルが要るため。
 */
export type ImageResolver = (
  source: string,
  context: { filePath: string | undefined },
) => Promise<ResolvedImage | undefined> | ResolvedImage | undefined;

export type ImageResolverOptions = {
  resolveImage?: ImageResolver;
};

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

/**
 * 画像に配信 URL・srcset・実寸を書き込む。
 *
 * <picture> と <source> はここでは作らない。本文の img はライトボックスの
 * ボタンに包まれるため、ここで <picture> を作ると <source> と <img> の間に
 * ボタンが挟まり、<source> が黙って無視される。組み立ては img を描く
 * コンポーネント側に任せ、<img> が <picture> の直接の子であることを保証する。
 */
export function rehypeResponsiveImages(resolveImage: ImageResolver | undefined) {
  return async (tree: HastRoot, file: { path?: string }) => {
    if (!resolveImage) return;

    // visit は同期なので、走査で対象を集めてから解決する。
    const images: Element[] = [];
    visit(tree, "element", (node) => {
      if (node.type !== "element" || node.tagName !== "img") return;
      if (typeof node.properties.src !== "string") return;
      images.push(node);
    });

    for (const node of images) {
      const source = node.properties.src;
      if (typeof source !== "string") continue;

      const resolved = await resolveImage(source, { filePath: file.path });
      if (!resolved) continue;

      const src = resolved.src ?? source;
      node.properties.src = src;
      node.properties.loading = "lazy";
      node.properties.decoding = "async";

      if (resolved.sizes && (resolved.srcSet || resolved.avifSrcSet)) {
        node.properties.sizes = resolved.sizes;
        node.properties["data-full-src"] = src;
        if (resolved.srcSet) node.properties.srcSet = resolved.srcSet;
        if (resolved.avifSrcSet) node.properties["data-avif-srcset"] = resolved.avifSrcSet;
      }

      applyIntrinsicSize(node, resolved);
    }
  };
}
