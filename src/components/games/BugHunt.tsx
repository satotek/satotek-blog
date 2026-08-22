import { useCallback, useEffect, useRef, useState } from "react";

// 500 エラーページの「バグ退治（もぐら叩き）」。
// 穴から出る 🐛 を制限時間内にクリックして潰す。

const HOLES = 9;
const GAME_TIME = 20;

export function BugHunt() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [bugs, setBugs] = useState<boolean[]>(() =>
    Array.from<boolean>({ length: HOLES }).fill(false),
  );
  const [hits, setHits] = useState<boolean[]>(() =>
    Array.from<boolean>({ length: HOLES }).fill(false),
  );

  const timeRef = useRef(GAME_TIME);

  // カウントダウン。0 で終了し、盤面のバグを片付ける。
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) {
        setRunning(false);
        setBugs(Array.from<boolean>({ length: HOLES }).fill(false));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // バグの出現。残り時間が減るほど間隔を詰めて難しくする。
  useEffect(() => {
    if (!running) return;
    let spawnId: ReturnType<typeof setTimeout>;
    const lifeIds: ReturnType<typeof setTimeout>[] = [];

    const spawn = () => {
      setBugs((current) => {
        const empty = current.flatMap((up, index) => (up ? [] : [index]));
        if (empty.length === 0) return current;
        const index = empty[(Math.random() * empty.length) | 0]!;
        lifeIds.push(
          setTimeout(
            () => setBugs((now) => now.map((up, i) => (i === index ? false : up))),
            700 + Math.random() * 700,
          ),
        );
        return current.map((up, i) => (i === index ? true : up));
      });
      const gap = Math.max(350, 900 - (GAME_TIME - timeRef.current) * 28);
      spawnId = setTimeout(spawn, gap);
    };

    spawn();
    return () => {
      clearTimeout(spawnId);
      for (const id of lifeIds) clearTimeout(id);
    };
  }, [running]);

  const start = useCallback(() => {
    timeRef.current = GAME_TIME;
    setScore(0);
    setTimeLeft(GAME_TIME);
    setBugs(Array.from<boolean>({ length: HOLES }).fill(false));
    setHits(Array.from<boolean>({ length: HOLES }).fill(false));
    setStarted(true);
    setRunning(true);
  }, []);

  const whack = (index: number) => {
    if (!running || !bugs[index]) return;
    setBugs((current) => current.map((up, i) => (i === index ? false : up)));
    setHits((current) => current.map((hit, i) => (i === index ? true : hit)));
    setTimeout(
      () => setHits((current) => current.map((hit, i) => (i === index ? false : hit))),
      260,
    );
    setScore((current) => current + 1);
  };

  return (
    <div className="mx-auto flex max-w-[360px] flex-col items-center gap-4">
      <dl className="flex gap-7">
        <Stat label="SCORE" value={score} />
        <Stat label="TIME" value={timeLeft} />
      </dl>

      <div className="grid w-full grid-cols-3 gap-3">
        {bugs.map((up, index) => (
          <button
            // 穴は固定数・固定位置なので index を key にして問題ない。
            key={index}
            type="button"
            aria-label="バグを潰す"
            onClick={() => whack(index)}
            className="relative aspect-square overflow-hidden rounded-full border border-line bg-card shadow-[inset_0_6px_14px_color-mix(in_srgb,var(--fg)_14%,transparent)] [-webkit-tap-highlight-color:transparent]"
          >
            <Sprite emoji="🐛" shown={up} />
            <Sprite emoji="💥" shown={Boolean(hits[index])} />
          </button>
        ))}
      </div>

      <p className="m-0 min-h-[1.4em] font-semibold text-accent" aria-live="polite">
        {started && !running ? `退治したバグ: ${score} 匹！` : ""}
      </p>
      <button
        type="button"
        className="rounded-full border-0 bg-accent px-7 py-2.5 font-semibold text-white transition-opacity duration-150 hover:opacity-90"
        onClick={start}
      >
        {started ? "リトライ" : "スタート"}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <dt className="text-[0.72rem] tracking-[0.12em] text-muted">{label}</dt>
      <dd className="m-0 text-[1.6rem] font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function Sprite({ emoji, shown }: { emoji: string; shown: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 flex items-center justify-center text-[clamp(28px,9vw,40px)] transition-[opacity,transform] duration-[120ms] ${
        shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-[40%] scale-[0.6] opacity-0"
      }`}
    >
      {emoji}
    </span>
  );
}
