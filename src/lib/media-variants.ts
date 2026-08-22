const rasterExtensions = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);
const mediaVariantWidths = [320, 480, 768, 1200] as const;

export type ResponsiveMedia = {
  srcSet: string;
  sizes: string;
};

export function createResponsiveMedia(
  source: string,
  { baseUrl, sizes = "100vw" }: { baseUrl: string; sizes?: string },
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
  const srcSet = mediaVariantWidths
    .map((width) => {
      const variantUrl = new URL(`${basePath}-${width}.webp`, mediaBaseUrl);
      return `${variantUrl} ${width}w`;
    })
    .join(", ");

  return { srcSet, sizes };
}
