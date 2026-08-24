import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * 履歴の移動（戻る・進む）で、次のナビゲーションを1回ぶん「履歴移動」と見なす。
 * popstate は戻る・進むの両方で発火し、リンク遷移では発火しないので、
 * 履歴インデックスでは区別できない「進む」と「リンク遷移」を見分けられる。
 */
let pendingTraversal = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    pendingTraversal = true;
  });
}

/**
 * 履歴を戻った・進んだかどうか。TanStack の history は履歴エントリごとに
 * `state.__TSR_index` を振るので、戻る側はその増減だけでも判定できる。
 */
function isHistoryTraversal(from: ParsedLocation | undefined, to: ParsedLocation) {
  // popstate 由来のフラグは1回のナビゲーションで使い切る。
  const popped = pendingTraversal;
  pendingTraversal = false;

  const fromIndex = from?.state.__TSR_index;
  const toIndex = to.state.__TSR_index;
  const wentBack =
    typeof fromIndex === "number" && typeof toIndex === "number" && toIndex < fromIndex;

  return popped || wentBack;
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    trailingSlash: "never",
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    // ページ遷移を View Transition に乗せる。実際の見え方は styles.css の
    // ::view-transition-*(page) 側で定義している。
    defaultViewTransition: {
      // 戻る・進むでは何もしない。ブラウザ自身が履歴移動の演出（iOS Safari の
      // スワイプバックなど）を持っており、そこへ重ねると前のページが一瞬
      // 差し込まれたように見えるため。types が false を返すと遷移ごと省かれる。
      types: ({ fromLocation, toLocation }) =>
        isHistoryTraversal(fromLocation, toLocation) ? false : [],
    },
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
