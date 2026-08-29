type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * 初期表示に不要な処理を、ブラウザが落ち着いてから実行する。
 * Safari など requestIdleCallback が無い環境では短いタイマーへフォールバックする。
 */
export function scheduleAfterIdle(callback: () => void, timeout = 2000) {
  if (typeof window === "undefined") return () => {};

  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(callback, { timeout });
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, Math.min(timeout, 1000));
  return () => window.clearTimeout(handle);
}
