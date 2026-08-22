import { Bot, Menu, Rss, X } from "lucide-react";
import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  Modal,
  ModalOverlay,
} from "react-aria-components";
import { useEffect, useId, useState, type ReactNode } from "react";

import { GA_INITIALIZER, GA_MEASUREMENT_ID, trackPageView } from "#/analytics/client";
import { categories } from "#/data/navigation";
import { SITE_DESCRIPTION, SITE_URL, createSocialMeta } from "#/lib/site";
import appCss from "../styles.css?url";

const THEME_INIT_SCRIPT = `(() => {
  try {
    const theme = localStorage.getItem("theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch {}
})();`;

const iconButtonClass =
  "h-[38px] w-[38px] items-center justify-center rounded-full border border-line bg-transparent text-muted no-underline transition-[background,border-color,color,transform] duration-200 [-webkit-tap-highlight-color:transparent] hover:border-accent-border hover:bg-accent-soft hover:text-ink active:scale-[0.92] motion-reduce:transition-none";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "satotek.dev" },
      {
        name: "description",
        content: "個人ブログ・技術メモ",
      },
      { name: "theme-color", content: "#f3ece0" },
      ...createSocialMeta({
        title: "satotek.dev",
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        includeImageDimensions: false,
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "/fonts.css" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", href: "/icons/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "satotek.dev",
        href: `${SITE_URL}/feed.xml`,
      },
    ],
  }),
  notFoundComponent: RootNotFound,
  shellComponent: RootDocument,
});

function RootNotFound() {
  return (
    <section className="mx-auto max-w-[820px] px-4 pb-12 pt-2 text-center sm:px-6">
      <p className="m-0 mt-2 text-[clamp(64px,18vw,120px)] leading-none tracking-[0.02em] text-accent">
        404
      </p>
      <p className="m-0 mt-2 text-[1.1rem]">ページが見つかりません。</p>
      <p className="mb-6 mt-1.5 text-muted">お探しのページは移動したか、まだ公開されていません。</p>
      <Link className="text-accent underline underline-offset-2" to="/">
        ← Homeへ戻る
      </Link>
    </section>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {GA_MEASUREMENT_ID ? (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <script dangerouslySetInnerHTML={{ __html: GA_INITIALIZER }} />
          </>
        ) : null}
        <HeadContent />
      </head>
      <body>
        <SiteChrome>
          <main className="mx-auto max-w-[1120px] px-4 pb-6 pt-2 sm:px-6">{children}</main>
        </SiteChrome>
        <Scripts />
      </body>
    </html>
  );
}

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

function ThemeToggle({ className }: { className?: string }) {
  const reactId = useId();
  const maskId = `theme-moon-${reactId.replace(/:/g, "")}`;

  return (
    <AriaButton
      className={`${iconButtonClass} theme-toggle ${className ?? ""}`}
      type="button"
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
    </AriaButton>
  );
}

function SiteChrome({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const closeDrawer = () => setDrawerOpen(false);

  // ドロワーはモバイル専用。開いたまま desktop 幅に広がるとトリガーが消えるので閉じる。
  useEffect(() => {
    const media = window.matchMedia("(min-width: 641px)");
    const handleChange = () => {
      if (media.matches) setDrawerOpen(false);
    };
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    const logo = document.querySelector<HTMLElement>("[data-sdot]");
    if (!logo) return;

    const letters = Array.from(logo.querySelectorAll<HTMLElement>(".letter-scroll"));
    const dot = logo.querySelector<SVGCircleElement>(".dot-scroll");
    const dotIndex = 7;
    const restCx = 11.5;
    const dotShift = dot ? restCx - Number(dot.getAttribute("cx") ?? "0") : 0;
    const threshold = 32;
    const duration = 700;
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
        const amount = index < dotIndex ? 9 + index * 1.2 : 20 + (index - dotIndex) * 3.2;
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
      const step = delta / duration;
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

    const sentinel = document.createElement("div");
    sentinel.style.cssText = `position:absolute;top:0;left:0;width:1px;height:${threshold}px;pointer-events:none;`;
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
  }, []);

  const navLinkClass = (active: boolean, drawer = false) =>
    [
      drawer
        ? "w-full rounded-lg px-3.5 py-3 text-base"
        : "shrink-0 whitespace-nowrap rounded-[7px] px-2 py-[3px] sm:rounded-[9px] sm:px-[11px] sm:py-[5px]",
      "font-semibold no-underline transition-[background,color] duration-150 hover:bg-hover hover:text-ink",
      active ? "bg-accent-soft text-accent" : "text-muted",
    ].join(" ");

  return (
    <>
      <header className="sticky top-0 z-50 bg-[color-mix(in_srgb,var(--bg)_80%,transparent)] backdrop-blur-[8px] backdrop-saturate-[180%]">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3.5 px-4 pb-3 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <SiteLogo />
            <div className="flex items-center gap-2">
              <a
                className={`${iconButtonClass} hidden sm:inline-flex`}
                href="/feed.xml"
                aria-label="RSS フィード"
              >
                <Rss className="size-5" aria-hidden="true" />
              </a>
              <a
                className={`${iconButtonClass} hidden sm:inline-flex`}
                href="/llms.txt"
                aria-label="llms.txt（LLM 向けサイト情報）"
              >
                <Bot className="size-5" aria-hidden="true" />
              </a>
              <ThemeToggle className="hidden sm:inline-flex" />
              <DialogTrigger isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
                <AriaButton
                  className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line bg-transparent text-ink transition-[background,border-color] duration-150 hover:border-accent-border hover:bg-accent-soft sm:hidden motion-reduce:transition-none"
                  type="button"
                  aria-label="メニュー"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </AriaButton>
                <ModalOverlay className="drawer-overlay" isDismissable>
                  <Modal className="drawer-panel">
                    <Dialog aria-label="メニュー" className="drawer-dialog" id="site-drawer">
                      <AriaButton
                        className="mb-1 inline-flex h-9 w-9 self-end items-center justify-center rounded-lg border-0 bg-transparent text-muted hover:bg-hover hover:text-ink"
                        type="button"
                        aria-label="メニューを閉じる"
                        onPress={closeDrawer}
                      >
                        <X className="size-5" aria-hidden="true" />
                      </AriaButton>
                      <NavigationLinks
                        onNavigate={closeDrawer}
                        navLinkClass={navLinkClass}
                        drawer
                      />
                      <div className="mt-auto flex items-center justify-center gap-2.5 pt-3.5">
                        <ThemeToggle className="inline-flex" />
                        <a
                          className={`${iconButtonClass} inline-flex`}
                          href="/feed.xml"
                          aria-label="RSS フィード"
                        >
                          <Rss className="size-5" aria-hidden="true" />
                        </a>
                        <a
                          className={`${iconButtonClass} inline-flex`}
                          href="/llms.txt"
                          aria-label="llms.txt（LLM 向けサイト情報）"
                        >
                          <Bot className="size-5" aria-hidden="true" />
                        </a>
                      </div>
                    </Dialog>
                  </Modal>
                </ModalOverlay>
              </DialogTrigger>
            </div>
          </div>
          <nav className="hidden sm:block" aria-label="グローバルナビ">
            <div className="flex flex-nowrap items-center gap-[clamp(0px,0.8vw,4px)] overflow-x-auto text-[clamp(0.8rem,3vw,0.95rem)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <NavigationLinks onNavigate={closeDrawer} navLinkClass={navLinkClass} />
            </div>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mx-auto mt-16 max-w-[1120px] border-t border-line px-4 py-8 text-[0.85rem] text-muted sm:px-6">
        <small>
          © 2026 <Link to="/profile">nosuke</Link>. All Rights Reserved.
        </small>
      </footer>
    </>
  );
}

function NavigationLinks({
  onNavigate,
  navLinkClass,
  drawer = false,
}: {
  onNavigate: () => void;
  navLinkClass: (active: boolean, drawer?: boolean) => string;
  drawer?: boolean;
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <>
      <Link className={navLinkClass(pathname === "/", drawer)} to="/" onClick={onNavigate}>
        Home
      </Link>
      <Link
        to="/posts"
        className={navLinkClass(pathname.startsWith("/posts"), drawer)}
        onClick={onNavigate}
      >
        記事
      </Link>
      {/* カテゴリはホームのサイドバーが担うため、ヘッダーではドロワー（モバイル）にだけ残す。 */}
      {drawer &&
        categories.map(({ slug, name }) => (
          <Link
            to="/categories/$slug"
            params={{ slug }}
            key={slug}
            className={navLinkClass(
              pathname === `/categories/${slug}` || pathname.startsWith(`/categories/${slug}/`),
              drawer,
            )}
            onClick={onNavigate}
          >
            {name}
          </Link>
        ))}
      <Link
        to="/tags"
        className={navLinkClass(pathname.startsWith("/tags"), drawer)}
        onClick={onNavigate}
      >
        タグ
      </Link>
      <Link
        to="/profile"
        className={navLinkClass(pathname.startsWith("/profile"), drawer)}
        onClick={onNavigate}
      >
        プロフィール
      </Link>
    </>
  );
}

function SiteLogo() {
  const letters = Array.from("SATOTEK.DEV");
  const dotIndex = 7;

  return (
    <Link
      className="inline-flex w-[clamp(150px,42vw,190px)] text-ink no-underline"
      to="/"
      aria-label="satotek.dev home"
      data-sdot="true"
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
          {letters.map((letter, index) => (
            <g className="[transform-box:fill-box] origin-center" key={`${letter}-${index}`}>
              {index === dotIndex ? (
                <circle
                  className="dot-scroll [transform-box:fill-box] origin-center fill-accent [will-change:transform,opacity]"
                  data-index={index}
                  cx="75"
                  cy="12.6"
                  r="1.45"
                />
              ) : (
                <text
                  className="letter-scroll [transform-box:fill-box] origin-center font-sans text-[14px] font-extrabold [fill:var(--fg)] [will-change:transform,opacity,filter]"
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
    </Link>
  );
}
