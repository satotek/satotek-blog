import { readFile } from "node:fs/promises";

import type { SatoriNode } from "satori";
import { describe, expect, test } from "vite-plus/test";

import { imageHeight, imageWidth, renderOgpSvg } from "./card";

// The Latin subsets that the site already serves. The real script downloads
// the full fonts, but layout only needs glyph metrics, and these keep the test
// offline.
async function latinFonts() {
  const font = (file: string) => readFile(new URL(`../../public/fonts/${file}`, import.meta.url));
  const [regular, bold] = await Promise.all([
    font("zen-kaku-gothic-new-400-120.woff2"),
    font("zen-kaku-gothic-new-700-241.woff2"),
  ]);

  return [
    { data: regular, name: "Zen Kaku Gothic New", weight: 400 as const, style: "normal" as const },
    { data: bold, name: "Zen Kaku Gothic New", weight: 700 as const, style: "normal" as const },
  ];
}

async function layout(content: Parameters<typeof renderOgpSvg>[0]) {
  const nodes: SatoriNode[] = [];
  await renderOgpSvg(content, await latinFonts(), (node) => nodes.push(node));
  return nodes;
}

describe("OGP card", () => {
  test("keeps every element inside the image", async () => {
    const nodes = await layout({
      category: "tech",
      tags: ["Cloudflare Workers", "TypeScript", "TanStack Start", "Vite Plus Migration"],
      title: "A title long enough to wrap onto a second line of the card",
    });

    // The decorative circle is meant to bleed off the corner.
    const laidOut = nodes.filter((node) => node.props.style?.position !== "absolute");
    expect(laidOut.length).toBeGreaterThan(0);

    for (const node of laidOut) {
      const label = node.textContent ?? node.type;
      expect(node.left, label).toBeGreaterThanOrEqual(0);
      expect(node.top, label).toBeGreaterThanOrEqual(0);
      expect(node.left + node.width, label).toBeLessThanOrEqual(imageWidth);
      expect(node.top + node.height, label).toBeLessThanOrEqual(imageHeight);
    }
  });

  test("shows the category and every tag", async () => {
    const nodes = await layout({
      category: "tech",
      tags: ["Android", "Kotlin", "Jetpack Compose", "Material 3 Expressive"],
      title: "Short title",
    });
    const texts = nodes.map((node) => node.textContent).filter(Boolean);

    expect(texts).toEqual(
      expect.arrayContaining([
        "tech",
        "Android",
        "Kotlin",
        "Jetpack Compose",
        "Material 3 Expres…",
      ]),
    );
  });
});
