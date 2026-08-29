import { mkdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";

import sharp from "sharp";

export const MEDIA_VARIANT_WIDTHS = [320, 480, 768, 1200] as const;
export const MEDIA_VARIANT_FORMATS = ["avif", "webp"] as const;

export type MediaVariantFormat = (typeof MEDIA_VARIANT_FORMATS)[number];

const rasterExtensions = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);

export type GeneratedMediaVariant = {
  file: string;
  format: MediaVariantFormat;
  key: string;
  width: number;
};

export type GenerateMediaVariantsOptions = {
  sourcePath: string;
  key: string;
  outputDirectory: string;
  formats?: readonly MediaVariantFormat[];
  widths?: readonly number[];
};

function isRasterImage(key: string) {
  return rasterExtensions.has(extname(key).toLowerCase());
}

function normalizeKey(key: string) {
  const normalized = key.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
  const parts = normalized.split("/");
  if (!normalized || parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error(`Invalid media key: ${key}`);
  }
  return normalized;
}

export async function generateMediaVariants({
  sourcePath,
  key,
  outputDirectory,
  formats = MEDIA_VARIANT_FORMATS,
  widths = MEDIA_VARIANT_WIDTHS,
}: GenerateMediaVariantsOptions): Promise<GeneratedMediaVariant[]> {
  const normalizedKey = normalizeKey(key);
  if (!isRasterImage(normalizedKey)) return [];

  const extension = extname(normalizedKey);
  const baseKey = normalizedKey.slice(0, -extension.length);
  const uniqueWidths = [...new Set(widths)].filter(
    (width): width is number => Number.isInteger(width) && width > 0,
  );
  const uniqueFormats = [...new Set(formats)].filter((format): format is MediaVariantFormat =>
    MEDIA_VARIANT_FORMATS.includes(format),
  );
  const variants: GeneratedMediaVariant[] = [];

  for (const format of uniqueFormats) {
    for (const width of uniqueWidths) {
      const variantKey = `${baseKey}-${width}.${format}`;
      const variantFile = join(outputDirectory, variantKey);

      await mkdir(dirname(variantFile), { recursive: true });
      const image = sharp(sourcePath).resize({ width, withoutEnlargement: true });
      if (format === "avif") {
        await image.avif({ quality: 55, effort: 4 }).toFile(variantFile);
      } else {
        await image.webp({ quality: 82, effort: 4 }).toFile(variantFile);
      }

      variants.push({ file: variantFile, format, key: variantKey, width });
    }
  }

  return variants;
}

export type MediaDimensions = {
  width: number;
  height: number;
};

export async function readImageDimensions(
  input: Buffer | string,
): Promise<MediaDimensions | undefined> {
  const { width, height } = await sharp(input).metadata();
  if (!width || !height) return undefined;
  return { width, height };
}
