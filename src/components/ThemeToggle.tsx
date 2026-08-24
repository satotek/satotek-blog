import { useId } from "react";

import { IconButton } from "#/components/ui";

function toggleTheme() {
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const current = root.getAttribute("data-theme") ?? (media.matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {}
}

export function ThemeToggle({ className }: { className?: string }) {
  const reactId = useId();
  const maskId = `theme-moon-${reactId.replace(/:/g, "")}`;

  return (
    <IconButton
      className={`theme-toggle ${className ?? ""}`}
      aria-label="テーマを切り替え"
      onPress={toggleTheme}
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
