/** ドックとデスクトップバーで切り替える並び。左から右が正方向。 */
export const dockSections = [
  { to: "/", prefixes: ["/"] },
  { to: "/posts", prefixes: ["/posts", "/categories", "/tags"] },
  { to: "/music", prefixes: ["/music"] },
  { to: "/profile", prefixes: ["/profile"] },
] as const;

export type DockPath = (typeof dockSections)[number]["to"];
export type DockTransitionType = "dock-forward" | "dock-back" | "dock-fade";

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

/** ドック遷移の移動方向に対応する View Transition の型名を返す。 */
export function dockTransitionType(from: string, to: string): DockTransitionType | null {
  const direction = dockDirection(from, to);
  if (direction === null) return null;
  if (direction === 0) return "dock-fade";
  return direction > 0 ? "dock-forward" : "dock-back";
}

type PendingDockTransition = {
  type: DockTransitionType;
  to: string;
};

let pendingDockTransition: PendingDockTransition | null = null;
let patchedStartViewTransition: Document["startViewTransition"] | null = null;

function ensureViewTransitionPatch() {
  if (typeof document === "undefined" || typeof document.startViewTransition !== "function") {
    return;
  }
  if (document.startViewTransition === patchedStartViewTransition) {
    return;
  }

  const originalStart = document.startViewTransition.bind(document);
  const patched = ((
    callbackOptions?: ViewTransitionUpdateCallback | StartViewTransitionOptions,
  ) => {
    // ThemeToggle の円形ワイプ中は data-theme-transition が付くので、
    // 進行中のドック遷移があってもテーマ切替には型を付けない。
    const isThemeTransition = "themeTransition" in document.documentElement.dataset;
    const pending = isThemeTransition ? null : pendingDockTransition;
    if (!isThemeTransition) {
      pendingDockTransition = null;
    }

    // 返却値 ViewTransition.types に追加すれば Level 1 のブラウザでも型エラーにならない。
    const transition = originalStart(callbackOptions as ViewTransitionUpdateCallback);
    if (pending) {
      transition.types?.add?.(pending.type);
    }
    return transition;
  }) as typeof document.startViewTransition;

  patchedStartViewTransition = patched;
  document.startViewTransition = patched;
}

/**
 * ドック／バーからのクリック時に呼ぶ。Void Router はデータ取得後に非同期で
 * startViewTransition を呼ぶため、開始時に型を付けられるよう保留しておく。
 */
export function prepareDockTransition(from: string, to: string) {
  const type = dockTransitionType(from, to);
  if (!type) {
    pendingDockTransition = null;
    return;
  }
  ensureViewTransitionPatch();
  pendingDockTransition = { type, to };
}

/** 別の遷移へ切り替わったときや失敗時に、保留中のドック遷移を破棄する。 */
export function clearDockTransition(expectedTo?: string) {
  if (!pendingDockTransition) return;
  if (expectedTo === undefined || pendingDockTransition.to !== expectedTo) {
    pendingDockTransition = null;
  }
}
