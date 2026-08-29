import { describe, expect, it } from "vite-plus/test";

import { createResponsiveMedia } from "./media-variants";

describe("createResponsiveMedia", () => {
  it("builds WebP candidates by default", () => {
    expect(
      createResponsiveMedia("https://img.satotek.dev/posts/photo.png", {
        baseUrl: "https://img.satotek.dev",
        sizes: "(max-width: 768px) 100vw, 768px",
      }),
    ).toEqual({
      sizes: "(max-width: 768px) 100vw, 768px",
      srcSet:
        "https://img.satotek.dev/posts/photo-320.webp 320w, https://img.satotek.dev/posts/photo-480.webp 480w, https://img.satotek.dev/posts/photo-768.webp 768w, https://img.satotek.dev/posts/photo-1200.webp 1200w",
    });
  });

  it("includes AVIF candidates only when the manifest says they exist", () => {
    expect(
      createResponsiveMedia("https://img.satotek.dev/posts/photo.png", {
        baseUrl: "https://img.satotek.dev",
        formats: ["avif", "webp"],
      }),
    ).toEqual({
      avifSrcSet:
        "https://img.satotek.dev/posts/photo-320.avif 320w, https://img.satotek.dev/posts/photo-480.avif 480w, https://img.satotek.dev/posts/photo-768.avif 768w, https://img.satotek.dev/posts/photo-1200.avif 1200w",
      sizes: "100vw",
      srcSet:
        "https://img.satotek.dev/posts/photo-320.webp 320w, https://img.satotek.dev/posts/photo-480.webp 480w, https://img.satotek.dev/posts/photo-768.webp 768w, https://img.satotek.dev/posts/photo-1200.webp 1200w",
    });
  });

  it("does not create variants for non-raster media", () => {
    expect(
      createResponsiveMedia("https://img.satotek.dev/posts/architecture.svg", {
        baseUrl: "https://img.satotek.dev",
      }),
    ).toBeUndefined();
  });
});
