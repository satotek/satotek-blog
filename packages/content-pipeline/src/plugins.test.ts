import { describe, expect, it } from "vite-plus/test";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { rehypeImageFigure, rehypeResponsiveImages, type ResolvedImage } from "./plugins.ts";

function render(markdown: string, resolveImage?: (source: string) => ResolvedImage | undefined) {
  return unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeImageFigure)
    .use(rehypeResponsiveImages, resolveImage)
    .use(rehypeStringify)
    .process(markdown)
    .then(String);
}

describe("rehypeResponsiveImages", () => {
  it("adds responsive attributes through the resolver", async () => {
    const html = await render("![Photo](/images/photo.png)", (source) =>
      source === "/images/photo.png"
        ? {
            srcSet: "/images/photo-320.webp 320w, /images/photo-768.webp 768w",
            sizes: "100vw",
          }
        : undefined,
    );

    expect(html).toContain('srcset="/images/photo-320.webp 320w, /images/photo-768.webp 768w"');
    expect(html).toContain('sizes="100vw"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });

  it("derives the missing dimension from the intrinsic aspect ratio", async () => {
    const sized = () => ({ width: 1600, height: 1065 });

    // 指定が無ければ実寸をそのまま出す。
    const intrinsic = await render("![Photo](/photo.png)", sized);
    expect(intrinsic).toContain('width="1600"');
    expect(intrinsic).toContain('height="1065"');
  });

  it("lazy-loads sized images even without responsive variants", async () => {
    const html = await render("![Photo](/photo.png)", () => ({ width: 800, height: 400 }));

    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).not.toContain("srcset=");
  });

  it("wraps a titled image in a figure", async () => {
    const html = await render('![Alt](/photo.png "キャプション")');

    expect(html).toContain("<figure>");
    expect(html).toContain("<figcaption>キャプション</figcaption>");
    expect(html).not.toContain("title=");
  });
});
