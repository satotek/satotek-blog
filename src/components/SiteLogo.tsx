import { useEffect, useRef } from "react";

import { RouterLink } from "#/components/ui";

const LETTERS = Array.from("SATOTEK.DEV");
const DOT_INDEX = 7;
/** スクロール量がこれを超えたらロゴを「ドットだけ」に畳む。 */
const THRESHOLD = 32;
const DURATION = 700;
const REST_CX = 11.5;

/**
 * スクロールに追従してロゴを畳むアニメーション。
 * スクロールごとの再レンダーを避けるため、React の state ではなく DOM を直接触る。
 */
function useLogoCollapse(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const logo = rootRef.current;
    if (!logo) return;

    const letters = Array.from(logo.querySelectorAll<HTMLElement>(".letter-scroll"));
    const dot = logo.querySelector<SVGCircleElement>(".dot-scroll");
    const dotShift = dot ? REST_CX - Number(dot.getAttribute("cx") ?? "0") : 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const ease = (value: number) =>
      value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2;

    const apply = (progress: number) => {
      for (const letter of letters) {
        const index = Number(letter.dataset.index);
        if (index === 0) {
          letter.style.opacity = "1";
          letter.style.transform = `translateX(${progress * 0.1}px)`;
          letter.style.filter = "none";
          continue;
        }
        const eased = ease(clamp((progress - index * 0.012) / 0.9, 0, 1));
        const amount = index < DOT_INDEX ? 9 + index * 1.2 : 20 + (index - DOT_INDEX) * 3.2;
        letter.style.opacity = String(1 - eased);
        letter.style.transform = `translateX(${-amount * eased}px) scaleX(${1 - 0.08 * eased})`;
        letter.style.filter = `blur(${0.25 * eased}px)`;
      }
      if (dot) {
        dot.style.transform = `translateX(${dotShift * progress}px) scale(${1 + 0.06 * progress})`;
      }
    };

    let armed = false;
    let target = 0;
    let current = 0;
    let rafId = 0;
    let lastTime = 0;

    const tick = (time: number) => {
      if (!lastTime) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;
      const step = delta / DURATION;
      if (current < target) current = Math.min(target, current + step);
      else if (current > target) current = Math.max(target, current - step);
      apply(ease(current));
      if (current !== target) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
        lastTime = 0;
      }
    };

    const run = () => {
      if (!rafId) {
        lastTime = 0;
        rafId = requestAnimationFrame(tick);
      }
    };

    const setTarget = (nextTarget: number) => {
      if (nextTarget === target) return;
      target = nextTarget;
      if (reduce) {
        current = nextTarget;
        apply(ease(current));
      } else {
        run();
      }
    };

    // scroll イベントではなく sentinel の交差で判定し、メインスレッドの負荷を避ける。
    const sentinel = document.createElement("div");
    sentinel.style.cssText = `position:absolute;top:0;left:0;width:1px;height:${THRESHOLD}px;pointer-events:none;`;
    document.body.appendChild(sentinel);

    const observer = new IntersectionObserver(
      (entries) => {
        const atTop = entries[entries.length - 1]?.isIntersecting ?? false;
        if (atTop) {
          armed = true;
          setTarget(0);
        } else {
          setTarget(armed ? 1 : 0);
        }
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    apply(0);

    return () => {
      observer.disconnect();
      sentinel.remove();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [rootRef]);
}

export function SiteLogo() {
  const ref = useRef<HTMLAnchorElement>(null);
  useLogoCollapse(ref);

  return (
    <RouterLink
      ref={ref}
      className="inline-flex w-[clamp(150px,42vw,190px)] text-ink no-underline"
      to="/"
      aria-label="satotek.dev home"
    >
      <svg
        className="block h-auto w-full overflow-visible"
        viewBox="0 0 110 16"
        width="110"
        height="16"
        role="img"
        aria-label="SATOTEK.DEV"
      >
        <g>
          {LETTERS.map((letter, index) => (
            <g className="origin-center [transform-box:fill-box]" key={`${letter}-${index}`}>
              {index === DOT_INDEX ? (
                <circle
                  className="dot-scroll origin-center fill-accent [transform-box:fill-box] [will-change:transform,opacity]"
                  data-index={index}
                  cx="75"
                  cy="12.6"
                  r="1.45"
                />
              ) : (
                <text
                  className="letter-scroll origin-center font-sans text-[14px] font-extrabold [fill:var(--fg)] [transform-box:fill-box] [will-change:transform,opacity,filter]"
                  data-index={index}
                  textAnchor="middle"
                  x={index * 10 + 5}
                  y="15"
                >
                  {letter}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>
    </RouterLink>
  );
}
