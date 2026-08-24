import { useId, useRef } from "react";

import { IconButton } from "#/components/ui";

const WIPE_MS = 480;

function applyTheme() {
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const current = root.getAttribute("data-theme") ?? (media.matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {}
}

/**
 * View Transitions で、押したボタンを中心に新しいテーマを円形に広げる。
 * 非対応ブラウザと「動きを減らす」設定では、そのまま即座に切り替える。
 */
function toggleTheme(origin: HTMLElement | null) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !document.startViewTransition || !origin) {
    applyTheme();
    return;
  }

  const rect = origin.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  // 画面の四隅のうち最も遠い角までを半径にして、全面を覆い切る。
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  // 本文の view-transition-name を一時的に外す。名前が付いたままだと本文が
  // root のスナップショットから抜けて、円形ワイプが本文を覆えない。
  const root = document.documentElement;
  root.dataset.themeTransition = "";

  const transition = document.startViewTransition(applyTheme);
  void transition.finished.finally(() => {
    delete root.dataset.themeTransition;
  });
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: WIPE_MS,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      // 連打などで transition が中断された場合。テーマ自体は適用済みなので何もしない。
    });
}

export function ThemeToggle({ className }: { className?: string }) {
  const reactId = useId();
  const maskId = `theme-moon-${reactId.replace(/:/g, "")}`;
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <IconButton
      ref={ref}
      className={`theme-toggle ${className ?? ""}`}
      aria-label="テーマを切り替え"
      onPress={() => toggleTheme(ref.current)}
    >
      <svg className="theme-toggle-glyph size-5" viewBox="0 0 24 24" aria-hidden="true">
        <mask id={maskId}>
          <rect width="24" height="24" fill="#fff" />
          <circle className="theme-toggle-cutout" cx="12" cy="12" r="8" fill="#000" />
        </mask>
        <circle
          className="theme-toggle-core"
          cx="12"
          cy="12"
          r="5.4"
          fill="currentColor"
          mask={`url(#${maskId})`}
        />
        <g
          className="theme-toggle-rays"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.7"
        >
          {Array.from({ length: 8 }, (_, index) => (
            <line
              key={index}
              x1="12"
              y1="2.4"
              x2="12"
              y2="5.1"
              transform={`rotate(${index * 45} 12 12)`}
            />
          ))}
        </g>
      </svg>
    </IconButton>
  );
}
