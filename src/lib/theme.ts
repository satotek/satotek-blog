export const THEME_STORAGE_KEY = "theme";

export type Theme = "dark" | "light" | "system";

/** 保存された選択が無ければ OS 設定に従う。 */
export const DEFAULT_THEME: Theme = "system";

/** ボタンを押したときに巡る順序。 */
const THEME_CYCLE: readonly Theme[] = ["system", "light", "dark"];

export const THEME_LABEL: Record<Theme, string> = {
  dark: "ダーク",
  light: "ライト",
  system: "システム設定",
};

export function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light" || value === "system";
}

/** 現在のテーマは DOM から読む。localStorage が使えない環境でも切り替えは動く。 */
export function readTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : DEFAULT_THEME;
}

export function nextTheme(current: Theme): Theme {
  const index = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? DEFAULT_THEME;
}

/**
 * アドレスバーの色。system のときはメディアクエリで OS に任せ、明示選択のときは
 * その 1 枚だけを有効にする（media="not all" は「常に不一致」なので実質無効）。
 * 色は styles.css の --bg と揃える必要がある。meta は CSS 変数を読めない。
 */
export const THEME_COLOR: Record<"dark" | "light", string> = {
  dark: "#1f1e1d",
  light: "#f3ece0",
};

export function syncThemeColor(theme: Theme) {
  for (const meta of document.querySelectorAll<HTMLMetaElement>(
    'meta[name="theme-color"][data-scheme]',
  )) {
    const scheme = meta.dataset.scheme;
    meta.media =
      theme === "system"
        ? `(prefers-color-scheme: ${scheme})`
        : theme === scheme
          ? "all"
          : "not all";
  }
}

export function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

/**
 * localStorage はクライアントにしか無いので、prerender した HTML はテーマを持てない。
 * body が 1px でも描かれる前に属性を付けるため、head で同期実行する。外部ファイル化や
 * defer では取得を待つ間に描画が始まり、テーマが反転して見える。
 *
 * 値は JSON.stringify で埋める。文字列連結だと定数に引用符が入った瞬間に壊れる。
 */
export const THEME_INIT_SCRIPT = `(()=>{const a=t=>{document.documentElement.dataset.theme=t;for(const m of document.querySelectorAll('meta[name="theme-color"][data-scheme]'))m.media=t==="system"?"(prefers-color-scheme: "+m.dataset.scheme+")":t===m.dataset.scheme?"all":"not all"};try{const t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});a(t==="dark"||t==="light"||t==="system"?t:${JSON.stringify(
  DEFAULT_THEME,
)})}catch{a(${JSON.stringify(DEFAULT_THEME)})}})();`;
