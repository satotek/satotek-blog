import { useEffect, useRef, useState } from "react";

// プロフィールに隠したゲームへの入口。
// コナミコマンド(↑↑↓↓←→←→BA) か、アバターを素早く7回タップで出現する。

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
] as const;

const TAPS_TO_UNLOCK = 7;
const TAP_WINDOW_MS = 1200;

/**
 * 隠しゲームの解禁状態を返す。
 * `avatarRef` に渡した要素の連打でも解禁できるようにする（モバイル向け）。
 */
export function useSecretUnlock(avatarRef: React.RefObject<HTMLElement | null>) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let position = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      position = key === KONAMI[position] ? position + 1 : key === KONAMI[0] ? 1 : 0;
      if (position === KONAMI.length) {
        position = 0;
        setUnlocked(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const avatar = avatarRef.current;
    if (!avatar) return;

    let taps = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onClick = () => {
      taps++;
      clearTimeout(timer);
      timer = setTimeout(() => {
        taps = 0;
      }, TAP_WINDOW_MS);
      if (taps >= TAPS_TO_UNLOCK) {
        taps = 0;
        setUnlocked(true);
      }
    };

    avatar.style.cursor = "pointer";
    avatar.addEventListener("click", onClick);
    return () => {
      clearTimeout(timer);
      avatar.removeEventListener("click", onClick);
    };
  }, [avatarRef]);

  return unlocked;
}

export function SecretGames() {
  const ref = useRef<HTMLDivElement>(null);

  // 解禁されたら画面内に送る。この要素は解禁時にしか描画されない。
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div ref={ref} className="animate-[secret-reveal_0.4s_ease_both]">
      <h2>隠しゲーム 🎮</h2>
      <p>見つけましたね。エラーページに仕込んだミニゲームです。</p>
      <div className="my-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <GameLink
          to="/play/blocks"
          emoji="🧱"
          title="ブロックパズル"
          note="存在しないURL → 404ページへ"
        />
        <GameLink
          to="/play/crash"
          emoji="🐛"
          title="バグ退治"
          note="わざと500を発生 → エラーページへ"
        />
      </div>
    </div>
  );
}

// TanStack の Link ではなく素の <a> を使う。片方は存在しないURL、片方は意図的な
// 500 で、どちらもクライアント遷移ではなくサーバーへの往復をさせたいため。
function GameLink({
  to,
  emoji,
  title,
  note,
}: {
  to: string;
  emoji: string;
  title: string;
  note: string;
}) {
  return (
    <a
      className="flex items-center gap-3.5 rounded-site border border-line bg-card px-4 py-3.5 !text-ink no-underline transition-[border-color,transform] duration-150 hover:-translate-y-[2px] hover:border-accent motion-reduce:transition-none"
      href={to}
    >
      <span className="text-[1.8rem] leading-none" aria-hidden="true">
        {emoji}
      </span>
      <span className="flex flex-col gap-0.5">
        <strong className="text-base">{title}</strong>
        <small className="text-[0.78rem] text-muted">{note}</small>
      </span>
    </a>
  );
}
