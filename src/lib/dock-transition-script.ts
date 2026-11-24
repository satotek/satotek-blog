import { dockSections } from "./nav";

/**
 * ドックとバーのクリックで、ページをまたぐ View Transition に向き（types）を付ける。
 *
 * ページは毎回ドキュメントごと読み直すので、ブラウザの cross-document View Transition を使う。
 * 新ページの pagereveal で遷移元と遷移先の並び順を比べ、CSS 側で向きを選ばせる。
 *
 * ドック以外のリンク（記事カードなど）は、縦のフェードのままにしたい。
 * 新ページからはどのリンクが押されたか分からないので、クリック時に sessionStorage へ印を残す。
 *
 * pagereveal は最初の描画より前に届く必要があるので、<head> のインラインスクリプトとして置く。
 * React のコードを待たずに動くよう、依存なしの小さな関数にしている。
 */
export const DOCK_TRANSITION_SCRIPT = `(() => {
  const sections = ${JSON.stringify(dockSections.map(({ to, prefixes }) => [to, prefixes]))};
  const KEY = "dock-nav";
  const indexOf = (path) => sections.findIndex(([to, prefixes]) =>
    to === "/" ? path === "/" : prefixes.some((p) => path === p || path.startsWith(p + "/")));

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element && event.target.closest("a[data-dock-link]");
    if (!link) return;
    try { sessionStorage.setItem(KEY, "1"); } catch {}
  }, { capture: true });

  addEventListener("pagereveal", (event) => {
    let fromDock = false;
    try { fromDock = sessionStorage.getItem(KEY) === "1"; sessionStorage.removeItem(KEY); } catch {}
    const transition = event.viewTransition;
    const activation = window.navigation && navigation.activation;
    if (!transition || !fromDock || !activation || !activation.from) return;
    const from = indexOf(new URL(activation.from.url).pathname);
    const to = indexOf(location.pathname);
    if (from < 0 || to < 0) return;
    transition.types.add(from === to ? "dock-fade" : to > from ? "dock-forward" : "dock-back");
  });
})();`;
