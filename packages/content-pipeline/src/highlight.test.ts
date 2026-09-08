import { describe, expect, it } from "vite-plus/test";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { rehypeCodeBlocks } from "./highlight.ts";

function render(markdown: string) {
  return unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeCodeBlocks)
    .use(rehypeStringify)
    .process(markdown)
    .then(String);
}

describe("rehypeCodeBlocks", () => {
  it("wraps highlighted code in line elements", async () => {
    const html = await render("```ts\nconst value = 1;\n\nconsole.log(value);\n```");

    expect(html).toContain("data-line-numbers");
    expect(html.match(/class="code-line"/g)).toHaveLength(3);
    expect(html.match(/class="code-line__break"/g)).toHaveLength(2);
    expect(html).toContain('<span class="pl-k">const</span>');
  });

  it("adds line elements even when a language is not registered", async () => {
    const html = await render("```unknown\nfirst\nsecond\n```");

    expect(html).toContain("data-line-numbers");
    expect(html.match(/class="code-line"/g)).toHaveLength(2);
    expect(html).toContain("first");
    expect(html).toContain("second");
  });
});
