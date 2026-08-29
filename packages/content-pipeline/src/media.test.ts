import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import sharp from "sharp";
import { describe, expect, it } from "vite-plus/test";

import { generateMediaVariants } from "./media";

describe("generateMediaVariants", () => {
  it("generates AVIF and WebP variants", async () => {
    const directory = await mkdtemp(join(tmpdir(), "satotek-media-test-"));
    const sourcePath = join(directory, "source.png");
    const outputDirectory = join(directory, "output");

    try {
      const source = await sharp({
        create: {
          width: 2,
          height: 1,
          channels: 3,
          background: { r: 190, g: 120, b: 90 },
        },
      })
        .png()
        .toBuffer();
      await writeFile(sourcePath, source);

      const variants = await generateMediaVariants({
        sourcePath,
        key: "posts/photo.png",
        outputDirectory,
        widths: [320],
      });

      expect(variants.map(({ format, key }) => `${format}:${key}`)).toEqual([
        "avif:posts/photo-320.avif",
        "webp:posts/photo-320.webp",
      ]);
      expect((await readdir(join(outputDirectory, "posts"))).sort()).toEqual([
        "photo-320.avif",
        "photo-320.webp",
      ]);
      expect(await readFile(join(outputDirectory, "posts/photo-320.avif"))).not.toHaveLength(0);
      expect(await readFile(join(outputDirectory, "posts/photo-320.webp"))).not.toHaveLength(0);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
