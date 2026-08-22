import { mkdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";

import sharp from "sharp";

export const MEDIA_VARIANT_WIDTHS = [320, 480, 768, 1200] as const;

const rasterExtensions = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);

export type GeneratedMediaVariant = {
  file: string;
  key: string;
  width: number;
};

export type GenerateMediaVariantsOptions = {
  sourcePath: string;
  key: string;
  outputDirectory: string;
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
  widths = MEDIA_VARIANT_WIDTHS,
}: GenerateMediaVariantsOptions): Promise<GeneratedMediaVariant[]> {
  const normalizedKey = normalizeKey(key);
  if (!isRasterImage(normalizedKey)) return [];

  const extension = extname(normalizedKey);
  const baseKey = normalizedKey.slice(0, -extension.length);
  const uniqueWidths = [...new Set(widths)].filter(
    (width): width is number => Number.isInteger(width) && width > 0,
  );
  const variants: GeneratedMediaVariant[] = [];

  for (const width of uniqueWidths) {
    const variantKey = `${baseKey}-${width}.webp`;
    const variantFile = join(outputDirectory, variantKey);

    await mkdir(dirname(variantFile), { recursive: true });
    await sharp(sourcePath)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toFile(variantFile);

    variants.push({ file: variantFile, key: variantKey, width });
  }

  return variants;
}
