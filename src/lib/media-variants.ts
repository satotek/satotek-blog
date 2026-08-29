const rasterExtensions = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);
const mediaVariantWidths = [320, 480, 768, 1200] as const;
const defaultMediaVariantFormats = ["webp"] as const;

export type MediaVariantFormat = "avif" | "webp";

export type ResponsiveMedia = {
  avifSrcSet?: string;
  srcSet?: string;
  sizes: string;
};

export function createResponsiveMedia(
  source: string,
  {
    baseUrl,
    formats = defaultMediaVariantFormats,
    sizes = "100vw",
  }: {
    baseUrl: string;
    formats?: readonly MediaVariantFormat[];
    sizes?: string;
  },
): ResponsiveMedia | undefined {
  let sourceUrl: URL;
  let mediaBaseUrl: URL;

  try {
    sourceUrl = new URL(source);
    mediaBaseUrl = new URL(`${baseUrl.replace(/\/+$/, "")}/`);
  } catch {
    return undefined;
  }

  if (sourceUrl.origin !== mediaBaseUrl.origin) return undefined;

  const extension = sourceUrl.pathname.slice(sourceUrl.pathname.lastIndexOf(".")).toLowerCase();
  if (!rasterExtensions.has(extension)) return undefined;

  const basePath = sourceUrl.pathname.slice(0, -extension.length);
  const createSrcSet = (format: MediaVariantFormat) =>
    mediaVariantWidths
      .map((width) => {
        const variantUrl = new URL(`${basePath}-${width}.${format}`, mediaBaseUrl);
        return `${variantUrl} ${width}w`;
      })
      .join(", ");

  const uniqueFormats = [...new Set(formats)];
  const srcSet = uniqueFormats.includes("webp") ? createSrcSet("webp") : undefined;
  const avifSrcSet = uniqueFormats.includes("avif") ? createSrcSet("avif") : undefined;
  if (!srcSet && !avifSrcSet) return undefined;

  return { ...(avifSrcSet ? { avifSrcSet } : {}), ...(srcSet ? { srcSet } : {}), sizes };
}
