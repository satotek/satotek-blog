export const SITE_URL = "https://satotek.dev";
export const SITE_DESCRIPTION = "個人ブログ・技術メモ";

export function absoluteUrl(path: string) {
  return path.startsWith("http") ? path : `${SITE_URL}${path}`;
}
