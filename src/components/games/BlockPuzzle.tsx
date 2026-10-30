import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "#/components/ui";

import { COLS, createPuzzle, ROWS, SHAPES } from "./block-puzzle";

// 404 ページのブロックパズル。Canvas + 命令的なゲームループ。規則は block-puzzle.ts。

const CELL = 24;

/** ゲームループから React に返す操作の口。ボタン UI はこれ越しに叩く。 */
type PuzzleApi = {
  move: (dx: number) => void;
  rotate: () => void;
  softDrop: () => void;
  hardDrop: () => void;
  reset: () => void;
};

export function BlockPuzzle() {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<PuzzleApi | null>(null);
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1 });

  useEffect(() => {
    const canvas = boardRef.current;
    const nextCanvas = nextRef.current;
    if (!canvas || !nextCanvas) return;

    const ctx = canvas.getContext("2d");
    const nctx = nextCanvas.getContext("2d");
    if (!ctx || !nctx) return;

    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;
    nextCanvas.width = 4 * CELL;
    nextCanvas.height = 4 * CELL;

    const puzzle = createPuzzle({ onHudChange: setHud });
    const { state } = puzzle;
    let paused = false;
    let dropAcc = 0;
    let lastT = 0;
    let rafId = 0;

    const drawCell = (g: CanvasRenderingContext2D, x: number, y: number, color: string) => {
      g.fillStyle = color;
      g.fillRect(x * CELL, y * CELL, CELL, CELL);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(x * CELL, y * CELL, CELL, 3);
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.fillRect(x * CELL, y * CELL + CELL - 3, CELL, 3);
      g.strokeStyle = "rgba(0,0,0,0.25)";
      g.lineWidth = 1;
      g.strokeRect(x * CELL + 0.5, y * CELL + 0.5, CELL - 1, CELL - 1);
    };

    const overlay = (line1: string, line2: string) => {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "700 26px system-ui, sans-serif";
      ctx.fillText(line1, canvas.width / 2, canvas.height / 2 - 6);
      ctx.font = "500 14px system-ui, sans-serif";
      ctx.fillText(line2, canvas.width / 2, canvas.height / 2 + 22);
    };

    const drawNext = () => {
      nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
      if (!state.nextPiece) return;
      const shape = SHAPES[state.nextPiece]!;
      for (const [cx, cy] of shape.cells) drawCell(nctx, cx, cy + 0.5, shape.color);
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 盤面のグリッド。--border は light-dark()/color-mix() のままの文字列で
      // 返ってくる（canvas は解釈できず代入が無視される）ので、canvas 自身の
      // 解決済み color を読む。text-line クラスがその値を --border に結びつけている。
      ctx.strokeStyle = getComputedStyle(canvas).color || "rgba(0,0,0,0.1)";
      ctx.lineWidth = 1;
      for (let x = 1; x < COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * CELL + 0.5, 0);
        ctx.lineTo(x * CELL + 0.5, canvas.height);
        ctx.stroke();
      }
      for (let y = 1; y < ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL + 0.5);
        ctx.lineTo(canvas.width, y * CELL + 0.5);
        ctx.stroke();
      }

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const color = state.board[y]![x];
          if (color) drawCell(ctx, x, y, color);
        }
      }

      const { current } = state;
      if (!state.gameOver) {
        // ゴースト（落下予測位置）
        const ghostY = puzzle.ghostY();
        ctx.globalAlpha = 0.22;
        for (const [cx, cy] of current.cells) {
          if (cy + ghostY >= 0) drawCell(ctx, cx + current.x, cy + ghostY, current.color);
        }
        ctx.globalAlpha = 1;
        for (const [cx, cy] of current.cells) {
          if (cy + current.y >= 0) drawCell(ctx, cx + current.x, cy + current.y, current.color);
        }
      }

      drawNext();
      if (state.gameOver) overlay("GAME OVER", "Rでリスタート");
      else if (paused) overlay("PAUSE", "Pで再開");
    };

    const move = (dx: number) => {
      if (puzzle.move(dx)) draw();
    };

    const rotate = () => {
      if (puzzle.rotate()) draw();
    };

    const softDrop = () => {
      puzzle.softDrop();
      draw();
    };

    const hardDrop = () => {
      puzzle.hardDrop();
      draw();
    };

    const loop = (t: number) => {
      rafId = requestAnimationFrame(loop);
      if (state.gameOver || paused) return;
      if (!lastT) lastT = t;
      dropAcc += t - lastT;
      lastT = t;
      if (dropAcc >= state.dropMs) {
        dropAcc = 0;
        softDrop();
      }
    };

    const reset = () => {
      puzzle.reset();
      dropAcc = 0;
      lastT = 0;
      paused = false;
      draw();
      if (!rafId) rafId = requestAnimationFrame(loop);
    };

    apiRef.current = { move, rotate, softDrop, hardDrop, reset };

    const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "]);
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (key === "r" || key === "R") return reset();
      if (key === "p" || key === "P") {
        paused = !paused;
        lastT = 0;
        draw();
        return;
      }
      if (state.gameOver || paused) return;
      if (GAME_KEYS.has(key)) event.preventDefault();

      // 矢印キーと vim 風(h/j/k/l)の両対応。
      if (key === "ArrowLeft" || key === "h") move(-1);
      else if (key === "ArrowRight" || key === "l") move(1);
      else if (key === "ArrowDown" || key === "j") softDrop();
      else if (key === "ArrowUp" || key === "k") rotate();
      else if (key === " ") hardDrop();
    };

    document.addEventListener("keydown", onKeyDown);
    reset();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (rafId) cancelAnimationFrame(rafId);
      apiRef.current = null;
    };
  }, []);

  return (
    <div className="m-0 mx-auto flex flex-wrap items-start justify-center gap-2.5 sm:gap-5">
      <canvas
        ref={boardRef}
        className="h-auto max-h-[44dvh] w-auto max-w-full touch-manipulation rounded-lg border border-line bg-card text-line sm:max-h-none"
      />

      <div className="flex min-w-0 flex-col gap-3.5 text-center sm:min-w-[150px] sm:gap-4 sm:text-left">
        <div className="flex flex-col items-center gap-1.5 sm:items-start">
          <span className="text-[0.72rem] tracking-[0.12em] text-muted">NEXT</span>
          <canvas
            ref={nextRef}
            className="size-14 rounded-lg border border-line bg-card sm:size-auto"
          />
        </div>

        <dl className="m-0 flex flex-col gap-2.5">
          <Stat label="SCORE" value={hud.score} />
          <Stat label="LINES" value={hud.lines} />
          <Stat label="LEVEL" value={hud.level} />
        </dl>

        <p className="m-0 hidden text-[0.78rem] leading-[1.7] text-muted sm:block">
          ← → / h l 移動
          <br />↑ / k 回転
          <br />↓ / j ソフトドロップ
          <br />
          Space ハードドロップ
          <br />P 一時停止 / R リスタート
        </p>
      </div>

      <TouchControls apiRef={apiRef} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center sm:items-start">
      <dt className="text-[0.72rem] tracking-[0.12em] text-muted">{label}</dt>
      <dd className="m-0 text-[1.2rem] font-bold tabular-nums sm:text-[1.4rem]">{value}</dd>
    </div>
  );
}

const PAD_KEY_CLASS =
  "min-h-[38px] touch-none select-none rounded-xl border border-line bg-card p-0 text-[1.1rem] text-ink [-webkit-tap-highlight-color:transparent] active:bg-accent active:text-white";

/** モバイル用のオンスクリーン操作。広い画面では出さない。 */
function TouchControls({ apiRef }: { apiRef: React.RefObject<PuzzleApi | null> }) {
  const call = useCallback(
    (run: (api: PuzzleApi) => void) => () => {
      const api = apiRef.current;
      if (api) run(api);
    },
    [apiRef],
  );

  return (
    <div className="mx-auto mt-0.5 flex w-full max-w-[300px] flex-col items-center gap-2 sm:hidden">
      <div className="grid w-full grid-cols-3 gap-2">
        <RepeatButton className={PAD_KEY_CLASS} onPress={call((a) => a.move(-1))} aria-label="左へ">
          ←
        </RepeatButton>
        <Button
          type="button"
          className={PAD_KEY_CLASS}
          onPress={call((a) => a.rotate())}
          aria-label="回転"
        >
          ⟳
        </Button>
        <RepeatButton className={PAD_KEY_CLASS} onPress={call((a) => a.move(1))} aria-label="右へ">
          →
        </RepeatButton>
        <RepeatButton
          className={PAD_KEY_CLASS}
          onPress={call((a) => a.softDrop())}
          aria-label="下へ"
        >
          ↓
        </RepeatButton>
        <Button
          type="button"
          className={`${PAD_KEY_CLASS} col-start-2 col-end-4 text-[1.05rem]`}
          onPress={call((a) => a.hardDrop())}
          aria-label="一気に落とす"
        >
          ⤓ 落とす
        </Button>
      </div>
      {/* リスタートは誤タップ防止でプレイ用ボタンから離す。 */}
      <Button
        type="button"
        className="touch-manipulation rounded-full border border-line bg-transparent px-4 py-1.5 text-[0.8rem] text-muted [-webkit-tap-highlight-color:transparent] active:text-ink"
        onPress={call((a) => a.reset())}
      >
        ↺ リスタート
      </Button>
    </div>
  );
}

/** 長押しで連続入力するボタン（左右移動・ソフトドロップ用）。 */
function RepeatButton({
  className,
  onPress,
  children,
  ...rest
}: {
  className: string;
  onPress: () => void;
  children: React.ReactNode;
} & React.AriaAttributes) {
  const timers = useRef<{
    delay?: ReturnType<typeof setTimeout>;
    tick?: ReturnType<typeof setInterval>;
  }>({});

  const stop = () => {
    clearTimeout(timers.current.delay);
    clearInterval(timers.current.tick);
    timers.current = {};
  };

  return (
    <Button
      type="button"
      className={className}
      onPressStart={() => {
        onPress();
        timers.current.delay = setTimeout(() => {
          timers.current.tick = setInterval(onPress, 70);
        }, 230);
      }}
      onPressEnd={stop}
      {...rest}
    >
      {children}
    </Button>
  );
}
