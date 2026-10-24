/** ibutya.com のタブ切替と同じ、24px・280ms・ease-out の横スライド。 */
const SHIFT_PX = 24;
const SLIDE_MS = 280;
const FADE_MS = 160;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

let running = false;

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

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * 旧ページを出してから新しいページを入れる。View Transition に載せるとドックが
 * スナップショットに取り込まれ、選択タイルのスライドが止まって見えるため、
 * ドックとバーのクリックでは本文だけをその場で動かす。
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

  try {
    const leave = main.animate(
      direction === 0
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            { opacity: 1, transform: "translate3d(0, 0, 0)" },
            { opacity: 0, transform: `translate3d(${-distance}px, 0, 0)` },
          ],
      { duration, easing: EASE, fill: "forwards" },
    );
    try {
      await leave.finished;
    } catch {
      // 連打でキャンセルされても、ページの入れ替えは続ける。
    }
    // アニメーションを消すと透明度が戻り、入れ替えの瞬間に旧ページが点く。
    main.style.opacity = "0";
    leave.cancel();

    await navigate();
    await nextFrame();

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
    try {
      await enter.finished;
    } catch {
      // 終了時に打ち消すので、ここで止まっても次の遷移は始められる。
    }
    enter.cancel();
  } finally {
    main.style.opacity = "";
    delete root.dataset.dockTransition;
    running = false;
  }
}
