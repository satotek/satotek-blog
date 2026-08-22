export const SITE_URL = "https://satotek.dev";
export const SITE_DESCRIPTION = "個人ブログ・技術メモ";
export const SOURCE_REPOSITORY_URL = "https://github.com/satotek/satotek-blog";
export const DEFAULT_OG_IMAGE_PATH = "/og-image.png";
export const DEFAULT_OG_IMAGE_URL = `${SITE_URL}${DEFAULT_OG_IMAGE_PATH}`;
export const OGP_BASE_URL = (import.meta.env.VITE_OGP_BASE_URL ?? "").trim().replace(/\/+$/, "");

export function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

export function generatedPostOgImageUrl(slug: string) {
  if (!OGP_BASE_URL) return undefined;
  return `${OGP_BASE_URL}/blog/ogp/${encodeURIComponent(slug)}.png`;
}

type SocialMetaOptions = {
  title: string;
  description: string;
  url: string;
  image?: string;
  imageAlt?: string;
  type?: "article" | "website";
  publishedTime?: string;
  includeImageDimensions?: boolean;
};

export function createSocialMeta({
  title,
  description,
  url,
  image,
  imageAlt,
  type = "website",
  publishedTime,
  includeImageDimensions = true,
}: SocialMetaOptions) {
  const imagePath = image ?? DEFAULT_OG_IMAGE_PATH;
  const imageUrl = absoluteUrl(imagePath);
  const usesDefaultImage =
    includeImageDimensions &&
    (imagePath === DEFAULT_OG_IMAGE_PATH || imageUrl === DEFAULT_OG_IMAGE_URL);

  return [
    { property: "og:type", content: type },
    { property: "og:site_name", content: "satotek.dev" },
    { property: "og:locale", content: "ja_JP" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: imageUrl },
    { property: "og:image:alt", content: imageAlt ?? title },
    ...(usesDefaultImage
      ? [
          { property: "og:image:type", content: "image/png" },
          { property: "og:image:width", content: "1200" },
          { property: "og:image:height", content: "630" },
        ]
      : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
    { name: "twitter:image:alt", content: imageAlt ?? title },
    ...(publishedTime ? [{ property: "article:published_time", content: publishedTime }] : []),
  ];
}

export function postSourceUrl(slug: string) {
  return `${SOURCE_REPOSITORY_URL}/blob/main/src/content/posts/${encodeURIComponent(slug)}/index.md`;
}
