/** ibutya.com のタブ切替と同じ、24px・280ms・ease-out の横スライド。 */
const SHIFT_PX = 24;
const SLIDE_MS = 280;
const FADE_MS = 160;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

let running = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function isDockTransitionRunning(): boolean {
  return running;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 新しいタブや修飾キー付きのクリックはブラウザに任せる。 */
export function isPlainLeftClick(event: {
  button: number;
  metaKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}): boolean {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}

function pageMain(): HTMLElement | null {
  const main = document.querySelector("body > main");
  return main instanceof HTMLElement ? main : null;
}

/**
 * 遷移で本文が差し替わっても、退場中はクリック時点の画面を見せる。
 * ヘッダーとドックより下に置き、選択タイルは実物のまま滑らせる。
 */
function holdLeavingPage(main: HTMLElement): HTMLElement {
  const rect = main.getBoundingClientRect();
  const layer = main.cloneNode(true);
  if (!(layer instanceof HTMLElement)) {
    throw new Error("page clone failed");
  }

  const top = Math.max(rect.top, 0);
  const bottom = Math.min(rect.bottom, window.innerHeight);
  layer.setAttribute("aria-hidden", "true");
  layer.inert = true;
  layer.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  layer.style.position = "fixed";
  layer.style.left = `${rect.left}px`;
  layer.style.width = `${rect.width}px`;
  layer.style.top = `${top}px`;
  layer.style.height = `${Math.max(bottom - top, 0)}px`;
  layer.style.margin = "0";
  layer.style.maxWidth = "none";
  layer.style.overflow = "hidden";
  layer.style.pointerEvents = "none";
  layer.style.zIndex = "30";
  layer.style.opacity = "1";
  layer.style.transform = "none";
  layer.style.viewTransitionName = "none";
  layer.setAttribute("data-dock-hold", "");
  document.body.append(layer);
  layer.scrollTop = Math.max(0, -rect.top);
  return layer;
}

/**
 * 旧ページを出してから新しいページを入れる。View Transition に載せるとドックが
 * スナップショットに取り込まれ、選択タイルのスライドが止まって見えるため、
 * ドックとバーのクリックでは本文だけをその場で動かす。
 * 読み込みは退場と同時に始め、画面が消えてから待ちが残らないようにする。
 */
export async function transitionDockPage(
  direction: -1 | 0 | 1,
  navigate: () => Promise<unknown>,
): Promise<void> {
  if (running) return;
  const main = pageMain();
  if (!main) {
    await navigate();
    return;
  }

  running = true;
  const root = document.documentElement;
  root.dataset.dockTransition = direction === 0 ? "fade" : direction > 0 ? "forward" : "back";
  const distance = direction * SHIFT_PX;
  const duration = direction === 0 ? FADE_MS : SLIDE_MS;
  let leaving: HTMLElement | null = null;

  try {
    leaving = holdLeavingPage(main);
    main.style.opacity = "0";
    const navigation = navigate();
    const leave = leaving.animate(
      direction === 0
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
            { opacity: 0, transform: `translate3d(${-distance}px, 0, 0)` },
          ],
      { duration, easing: EASE, fill: "forwards" },
    );
    const hold = leaving;
    void leave.finished.catch(() => undefined).finally(() => hold.remove());
    // 退場の終わりはもう透明なので、そこで待たずに次のページを重ねる。
    // 待ち切ると、空白が一度挟まってちらつく。
    await Promise.all([navigation, delay(duration - Math.round(duration * 0.35))]);

    // forward / back / fade の間は記事の出現を止めている。入る瞬間に再開する。
    root.dataset.dockTransition = "enter";
    const enter = main.animate(
      direction === 0
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: `translate3d(${distance}px, 0, 0)` },
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
          ],
      { duration, easing: EASE, fill: "forwards" },
    );
    main.style.opacity = "";
    leaving = null;
    try {
      await enter.finished;
    } catch {
      // 終了時に打ち消すので、ここで止まっても次の遷移は始められる。
    }
    enter.cancel();
  } finally {
    leaving?.remove();
    main.style.opacity = "";
    delete root.dataset.dockTransition;
    running = false;
  }
}
