import { useCallback, useEffect, useRef, useState } from "react";

import { Link as AriaLink } from "#/components/ui";

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
 * 返した `onAvatarPress` をプロフィール画像の React Aria ボタンに渡すと、
 * モバイルの連打でも解禁できる。
 */
export function useSecretUnlock() {
  const [unlocked, setUnlocked] = useState(false);
  const tapsRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  const onAvatarPress = useCallback(() => {
    tapsRef.current += 1;
    clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapsRef.current = 0;
    }, TAP_WINDOW_MS);

    if (tapsRef.current >= TAPS_TO_UNLOCK) {
      tapsRef.current = 0;
      setUnlocked(true);
    }
  }, []);

  useEffect(() => () => clearTimeout(tapTimerRef.current), []);

  return { onAvatarPress, unlocked };
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

// TanStack RouterのRouterLinkではなくReact AriaのLinkを使う。片方は存在しないURL、片方は意図的な
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
    <AriaLink
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
    </AriaLink>
  );
}
