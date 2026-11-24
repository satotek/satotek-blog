export const FONTS_HREF = "/fonts.css";

// font-display: swap を宣言している以上、フォントは FCP のクリティカルパスに無い。
// woff2 を preload すると最優先で 58KB を取りに行き、低速回線では描画に必要な
// CSS を押しのける（Slow 4G 実測で FCP 836ms → 1044ms）。先読みするのは定義ファイルだけにとどめる。
// カスタムフォントは font-display: swap なので、フォント定義を待たずに本文を描画できる。
// preload で CSS だけを先に取得し、初回描画後の idle 時に stylesheet へ切り替える。
// これにより HTML → fonts.css → 日本語サブセットという依存を初期表示から外す。
export const DEFERRED_FONTS_SCRIPT = `(() => {
  const link = document.querySelector('link[data-site-fonts]');
  if (!link) return;

  const enable = () => {
    link.rel = "stylesheet";
    link.removeAttribute("as");
  };

  const schedule = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(enable, { timeout: 1200 });
    } else {
      window.setTimeout(enable, 0);
    }
  };

  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(schedule);
  } else {
    window.setTimeout(schedule, 0);
  }
})();`;
