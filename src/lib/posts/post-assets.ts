/**
 * 記事の画像は index.mdx の隣の assets/ に原本を置き、配信は R2 から行う。
 * 原文には `./assets/photo.webp` と書き、ここで `<slug>/photo.webp` という
 * オブジェクトキーへ写す。ビルド時（vite.config）とサマリ生成の両方が使う。
 */
const postAssetPattern = /^\.\/assets\/([^/]+)$/;

export function postAssetKey(slug: string, source: string): string | undefined {
  const match = postAssetPattern.exec(source);
  return match?.[1] ? `${slug}/${match[1]}` : undefined;
}

export function mediaUrlForKey(baseUrl: string, key: string) {
  const path = key
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${baseUrl.replace(/\/+$/, "")}/${path}`;
}
