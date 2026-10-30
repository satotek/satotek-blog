import { describe, expect, it } from "vite-plus/test";

import { hueFor, initialOf } from "./artwork";

describe("initialOf", () => {
  it("takes the first grapheme and upper-cases it", () => {
    expect(initialOf("  radiohead")).toBe("R");
    expect(initialOf("宇多田ヒカル")).toBe("宇");
  });

  it("keeps a joined emoji whole", () => {
    expect(initialOf("👨‍👩‍👧 family")).toBe("👨‍👩‍👧");
  });

  it("falls back to a note for an empty label", () => {
    expect(initialOf("   ")).toBe("♪");
  });
});

describe("hueFor", () => {
  it("gives the same name the same hue within 0-359", () => {
    const hue = hueFor("Daft Punk");
    expect(hueFor("Daft Punk")).toBe(hue);
    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });
});
