import type { MediaVariantFormat } from "./media-variants";

export type MediaDimensions = {
  width: number;
  height: number;
  formats?: readonly MediaVariantFormat[];
};

export type MediaManifest = Record<string, MediaDimensions>;

/**
 * 画像 URL からマニフェストのキー（R2 のオブジェクトキー）を取り出す。
 * 配信ドメイン外の画像は寸法を持てないので undefined を返す。
 */
export function mediaKeyFromUrl(source: string, baseUrl: string): string | undefined {
  let sourceUrl: URL;
  let mediaBaseUrl: URL;

  try {
    sourceUrl = new URL(source);
    mediaBaseUrl = new URL(`${baseUrl.replace(/\/+$/, "")}/`);
  } catch {
    return undefined;
  }

  if (sourceUrl.origin !== mediaBaseUrl.origin) return undefined;

  const key = decodeURIComponent(sourceUrl.pathname).replace(/^\/+/, "");
  return key || undefined;
}

export function mediaFormatsForUrl(
  source: string,
  baseUrl: string,
  manifest: MediaManifest,
): readonly MediaVariantFormat[] {
  const key = mediaKeyFromUrl(source, baseUrl);
  return manifest[key ?? ""]?.formats ?? ["webp"];
}
