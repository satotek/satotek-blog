import { describe, expect, it } from "vite-plus/test";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { rehypeImageFigure, rehypeResponsiveImages, type ImageResolver } from "./plugins.ts";

function render(markdown: string, resolveImage?: ImageResolver) {
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
            avifSrcSet: "/images/photo-320.avif 320w",
            srcSet: "/images/photo-320.webp 320w, /images/photo-768.webp 768w",
            sizes: "100vw",
          }
        : undefined,
    );

    expect(html).toContain('srcset="/images/photo-320.webp 320w, /images/photo-768.webp 768w"');
    expect(html).toContain('data-avif-srcset="/images/photo-320.avif 320w"');
    expect(html).toContain('sizes="100vw"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
  });

  // <source> が効くのは <picture> の直接の子の <img> だけなので、拡大ボタンを
  // 挟むコンポーネント側に組み立てを任せる。ここで <picture> を作ってはいけない。
  it("leaves the picture element to the component that renders the image", async () => {
    const html = await render("![Photo](/images/photo.png)", () => ({
      avifSrcSet: "/images/photo-320.avif 320w",
      srcSet: "/images/photo-320.webp 320w",
      sizes: "100vw",
    }));

    expect(html).not.toContain("<picture>");
    expect(html).not.toContain("<source");
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

  it("rewrites a relative source to the resolved delivery URL", async () => {
    const html = await render("![Photo](./assets/photo.webp)", async (source) => ({
      src: `https://img.example.com/first-post/${source.replace("./assets/", "")}`,
      srcSet: "https://img.example.com/first-post/photo-320.webp 320w",
      sizes: "100vw",
    }));

    expect(html).toContain('src="https://img.example.com/first-post/photo.webp"');
    expect(html).toContain('data-full-src="https://img.example.com/first-post/photo.webp"');
    expect(html).not.toContain("./assets/");
  });

  it("passes the MDX path to the resolver", async () => {
    const seen: (string | undefined)[] = [];
    await unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeResponsiveImages, ((_source, { filePath }) => {
        seen.push(filePath);
        return undefined;
      }) satisfies ImageResolver)
      .use(rehypeStringify)
      .process({ path: "/posts/first-post/index.mdx", value: "![Photo](./assets/photo.webp)" });

    expect(seen).toEqual(["/posts/first-post/index.mdx"]);
  });

  it("wraps a titled image in a figure", async () => {
    const html = await render('![Alt](/photo.png "キャプション")');

    expect(html).toContain("<figure>");
    expect(html).toContain("<figcaption>キャプション</figcaption>");
    expect(html).not.toContain("title=");
  });
});
