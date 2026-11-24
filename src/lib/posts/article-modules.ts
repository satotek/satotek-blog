import type { ReactElement } from "react";

import type { articleComponents } from "#/components/article/Article";

export type ArticleModule = {
  default: (props: { components?: typeof articleComponents }) => ReactElement;
};

// eager: true の glob はファイル先頭の静的 import に展開され、SSR の分岐で囲んでも
// クライアントのチャンクに全記事が残る。glob は遅延読み込みの1つだけにし、SSR では先に全部待つ。
const loaders = import.meta.glob<ArticleModule>("../../content/posts/*/index.mdx");

const loaded = new Map<string, ArticleModule>();
const pending = new Map<string, Promise<ArticleModule | undefined>>();

function pathOf(slug: string) {
  return `../../content/posts/${slug}/index.mdx`;
}

/** 読み込み済みの記事を同期で返す。SSR とハイドレーションは Suspense を挟まずに描くためにこれを使う。 */
export function getLoadedArticle(slug: string): ArticleModule | undefined {
  return loaded.get(slug);
}

/** 記事本文のチャンクを読む。同じ記事は1回だけ取りに行く。 */
export function loadArticle(slug: string): Promise<ArticleModule | undefined> {
  const cached = pending.get(slug);
  if (cached) return cached;
  const load = loaders[pathOf(slug)];
  if (!load) return Promise.resolve(undefined);
  const promise = load().then((mod) => {
    loaded.set(slug, mod);
    return mod;
  });
  pending.set(slug, promise);
  return promise;
}

/**
 * リンクにポインタやフォーカスが来た時点で本文を先読みする。
 * Void の prefetch はページのデータとコードまでで、ページの中で動的 import する本文は読まないため。
 */
export function preloadArticle(slug: string) {
  loadArticle(slug).catch(() => {
    // 失敗したら遷移後に Suspense の中で読み直す。
    pending.delete(slug);
  });
}

if (import.meta.env.SSR) {
  await Promise.all(Object.keys(loaders).map((path) => loadArticle(path.split("/").at(-2) ?? "")));
} else if (typeof window !== "undefined") {
  // 記事を直接開いたときは、hydrate の前にその記事だけ読んでおく。
  // SSR 済みの HTML と同じものを同期で描けるので、Suspense の fallback に戻らない。
  const match = window.location.pathname.match(/^\/posts\/([^/]+?)(?:\.html)?$/);
  if (match) {
    await loadArticle(decodeURIComponent(match[1])).catch(() => undefined);
  }
}
