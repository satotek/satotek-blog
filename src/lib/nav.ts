/** ドックとデスクトップバーで切り替える並び。左から右が正方向。 */
export const dockSections = [
  { to: "/", prefixes: ["/"] },
  { to: "/posts", prefixes: ["/posts", "/categories", "/tags"] },
  { to: "/music", prefixes: ["/music"] },
  { to: "/profile", prefixes: ["/profile"] },
] as const;

export type DockPath = (typeof dockSections)[number]["to"];

/** カテゴリとタグは記事一覧の絞り込みなので、ドック上は記事と同じ位置。 */
export function dockIndex(pathname: string): number {
  return dockSections.findIndex(({ to, prefixes }) =>
    to === "/"
      ? pathname === "/"
      : prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)),
  );
}

/**
 * ドック上の移動方向。1 は右へ、-1 は左へ、0 は同じ項目のまま別ページ。
 * どちらかがドックの対象外なら null。
 */
export function dockDirection(from: string, to: string): -1 | 0 | 1 | null {
  const fromIndex = dockIndex(from);
  const toIndex = dockIndex(to);
  if (fromIndex < 0 || toIndex < 0) return null;
  if (toIndex === fromIndex) return 0;
  return toIndex > fromIndex ? 1 : -1;
}
