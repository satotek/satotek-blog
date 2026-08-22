export const SITE_URL = "https://satotek.dev";
export const SITE_NAME = "satotek.dev";
export const SITE_DESCRIPTION = "個人ブログ・技術メモ";
export const SOURCE_REPOSITORY_URL = "https://github.com/satotek/satotek-blog";
export const MEDIA_BASE_URL = (import.meta.env.VITE_MEDIA_BASE_URL ?? "https://img.satotek.dev")
  .trim()
  .replace(/\/+$/, "");
export const DEFAULT_OG_IMAGE_KEY = "site/og-image.png";
export const DEFAULT_OG_IMAGE_URL = `${MEDIA_BASE_URL}/${DEFAULT_OG_IMAGE_KEY}`;
export const OGP_BASE_URL = (import.meta.env.VITE_OGP_BASE_URL ?? "").trim().replace(/\/+$/, "");

export function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}

export function mediaUrl(key: string) {
  return `${MEDIA_BASE_URL}/${key.replace(/^\/+/, "")}`;
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
  const imageUrl = image ? absoluteUrl(image) : DEFAULT_OG_IMAGE_URL;
  const usesDefaultImage = includeImageDimensions && !image;

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
  return `${SOURCE_REPOSITORY_URL}/blob/main/content/posts/${encodeURIComponent(slug)}/index.md`;
}

type PageHeadOptions = Omit<SocialMetaOptions, "url"> & {
  /** サイトルートからの絶対パス。canonical と og:url の両方に使う。 */
  path: string;
  /** OGP 用のタイトル。省略時は title と同じ。 */
  socialTitle?: string;
};

/**
 * ルートの head() 用。title / description / canonical / OGP の組み立てを1箇所にまとめる。
 * 各ルートで meta 配列を手書きすると canonical のエンコード漏れなどがズレるため。
 */
export function createPageHead({
  title,
  description,
  path,
  socialTitle,
  ...social
}: PageHeadOptions) {
  // 末尾スラッシュを落として canonical を1つの形に揃える（"/" はサイトルート）。
  const url = absoluteUrl(path).replace(/\/+$/, "");

  return {
    meta: [
      { title },
      { name: "description", content: description },
      ...createSocialMeta({ ...social, title: socialTitle ?? title, description, url }),
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** ページ固有のタイトルにサイト名を付ける。付け方を1箇所に固定するためのもの。 */
export function withSiteName(title: string) {
  return `${title} | ${SITE_NAME}`;
}
