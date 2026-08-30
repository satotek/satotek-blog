import { useEffect, useId, useState } from "react";

import { IconButton } from "#/components/ui";
import {
  nextTheme,
  readTheme,
  storeTheme,
  syncThemeColor,
  THEME_LABEL,
  type Theme,
} from "#/lib/theme";

const CROSSFADE_MS = 280;

function applyTheme(onApplied: (theme: Theme) => void) {
  const next = nextTheme(readTheme());
  document.documentElement.dataset.theme = next;
  syncThemeColor(next);
  storeTheme(next);
  onApplied(next);
}

/**
 * View Transitions で新旧のテーマをクロスフェードする。
 * opacity だけを動かすのは、Chrome で clip-path の形状アニメーションが
 * スナップショットの再ラスタライズを伴い、大きなビューポートでコマ落ちするため。
 * opacity はコンポジタだけで完結する。
 *
 * 非対応ブラウザと「動きを減らす」設定では、そのまま即座に切り替える。
 */
function toggleTheme(onApplied: (theme: Theme) => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !document.startViewTransition) {
    applyTheme(onApplied);
    return;
  }

  // 本文の view-transition-name を一時的に外す。名前が付いたままだと本文が
  // root のスナップショットから抜けて、テーマの切り替えから取り残される。
  // 同じ属性が、アイコンのモーフをクロスフェード後まで遅らせる役目も持つ。
  const root = document.documentElement;
  root.dataset.themeTransition = "";

  const transition = document.startViewTransition(() => applyTheme(onApplied));
  void transition.finished.finally(() => {
    delete root.dataset.themeTransition;
  });
  transition.ready
    .then(() => {
      root.animate(
        { opacity: [0, 1] },
        {
          duration: CROSSFADE_MS,
          easing: "ease",
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
  // サーバーは閲覧者のテーマを知り得ないので、初期描画は状態を含まない名前にする。
  // マウント後に現在のモードを補うことで、ハイドレーション不一致を避ける。
  const [theme, setTheme] = useState<Theme>();

  useEffect(() => setTheme(readTheme()), []);

  return (
    <IconButton
      className={`theme-toggle ${className ?? ""}`}
      aria-label={theme ? `テーマ: ${THEME_LABEL[theme]}（切り替える）` : "テーマを切り替え"}
      onPress={() => toggleTheme(setTheme)}
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
