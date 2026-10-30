import { useEffect, useState, type CSSProperties } from "react";

/** 入場アニメーションの順番（--i）と、再生回数の割合（--share, 0〜1）を CSS へ渡す。 */
export function motionStyle(index: number, share?: number) {
  return { "--i": index, "--share": share } as CSSProperties;
}

/** 数字を 0 から数え上げる。動きを減らす設定では最初から最終値を出す。 */
export function useCountUp(target: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}
