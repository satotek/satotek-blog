import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vite-plus/test";

import { createMarkdownRenderer } from "./index";

const onigWasm = await readFile(new URL("../assets/onig.wasm", import.meta.url));
const renderer = createMarkdownRenderer(onigWasm);

describe("Markdown renderer", () => {
  it("renders headings, links, and Shiki code blocks", async () => {
    const rendered = await renderer.renderMarkdown(
      [
        "# Title",
        "",
        "## Setup",
        "",
        "Read the [documentation](https://example.com).",
        "",
        '```ts title="example.ts"',
        "const answer = 42;",
        "```",
      ].join("\n"),
    );

    expect(rendered.toc).toEqual([{ id: "setup", text: "Setup", level: 2 }]);
    expect(rendered.html).toContain('<h1 id="title">');
    expect(rendered.html).toContain('<h2 id="setup">');
    expect(rendered.html).toContain('class="code-block"');
    expect(rendered.html).toContain('data-lang="ts"');
    expect(rendered.html).toContain("example.ts");
    expect(rendered.html).toContain('target="_blank"');
    expect(rendered.html).toContain('rel="noopener"');
  });

  it("adds responsive image attributes through the resolver", async () => {
    const responsiveRenderer = createMarkdownRenderer(onigWasm, {
      resolveImage: (source) =>
        source === "/images/photo.png"
          ? {
              avifSrcSet: "/images/photo-320.avif 320w, /images/photo-768.avif 768w",
              srcSet: "/images/photo-320.webp 320w, /images/photo-768.webp 768w",
              sizes: "100vw",
            }
          : undefined,
    });

    const rendered = await responsiveRenderer.renderMarkdown("![Photo](/images/photo.png)");

    expect(rendered.html).toContain(
      'srcset="/images/photo-320.webp 320w, /images/photo-768.webp 768w"',
    );
    expect(rendered.html).toContain(
      '<source type="image/avif" sizes="100vw" srcset="/images/photo-320.avif 320w, /images/photo-768.avif 768w">',
    );
    expect(rendered.html).toContain('<source type="image/webp" sizes="100vw"');
    expect(rendered.html).toContain('sizes="100vw"');
    expect(rendered.html).toContain('loading="lazy"');
    expect(rendered.html).toContain('decoding="async"');
  });

  it("derives the missing image dimension from the intrinsic aspect ratio", async () => {
    const sizedRenderer = createMarkdownRenderer(onigWasm, {
      resolveImage: () => ({ width: 1600, height: 1065 }),
    });

    // 著者が width だけ指定した場合、height は実寸比から補う。
    const authored = await sizedRenderer.renderMarkdown("![Photo](/photo.png){width=600}");
    expect(authored.html).toContain('width="600"');
    expect(authored.html).toContain('height="399"');

    // 指定が無ければ実寸をそのまま出す。
    const intrinsic = await sizedRenderer.renderMarkdown("![Photo](/photo.png)");
    expect(intrinsic.html).toContain('width="1600"');
    expect(intrinsic.html).toContain('height="1065"');

    // 両方指定されていれば、著者の指定を上書きしない。
    const explicit = await sizedRenderer.renderMarkdown(
      "![Photo](/photo.png){width=800 height=200}",
    );
    expect(explicit.html).toContain('width="800"');
    expect(explicit.html).toContain('height="200"');
  });

  it("renders image attributes inside list items", async () => {
    const rendered = await renderer.renderMarkdown(
      [
        "1. Open chrome://flags",
        "2. Enable WebMCP testing",
        "",
        '   ![Flag](/images/flag.png "WebMCP testing"){width=768 .center}',
        "",
        "3. Restart Chrome",
      ].join("\n"),
    );

    expect(rendered.html).toContain("<figure>");
    expect(rendered.html).toContain('width="768"');
    expect(rendered.html).toContain('class="center"');
    expect(rendered.html).not.toContain("{width=768 .center}");
  });

  it("lazy-loads sized images even when no responsive variants exist", async () => {
    const rendered = await createMarkdownRenderer(onigWasm, {
      resolveImage: () => ({ width: 1180, height: 640 }),
    }).renderMarkdown("![Architecture](https://example.com/architecture.svg)");

    expect(rendered.html).toContain('loading="lazy"');
    expect(rendered.html).toContain('decoding="async"');
    expect(rendered.html).toContain('width="1180"');
    expect(rendered.html).toContain('height="640"');
  });
});
