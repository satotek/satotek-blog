import { useCallback, useEffect, useRef, useState } from "react";

// 404 ページのブロックパズル。Canvas + 命令的なゲームループ。
// ルール（落下・ライン消去）は一般的な仕組みで、名称・配色・見た目は独自。

type Shape = { color: string; cells: readonly (readonly [number, number])[] };
type Piece = { key: string; color: string; cells: [number, number][]; x: number; y: number };

const COLS = 10;
const ROWS = 20;
const CELL = 24;

// 配色はサイトに合わせたアーストーン。
const SHAPES: Record<string, Shape> = {
  I: {
    color: "#4a8c8c",
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  O: {
    color: "#c99a3f",
    cells: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
  },
  T: {
    color: "#8d6a8e",
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  S: {
    color: "#7a8b4f",
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  Z: {
    color: "#bd5a36",
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  J: {
    color: "#8a6d4f",
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  L: {
    color: "#c4756b",
    cells: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
};
const KEYS = Object.keys(SHAPES);

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

    let board: (string | null)[][] = [];
    let current: Piece;
    let nextPiece: string | null = null;
    let score = 0;
    let lines = 0;
    let level = 1;
    let gameOver = false;
    let paused = false;
    let dropMs = 600;
    let dropAcc = 0;
    let lastT = 0;
    let rafId = 0;

    const emptyBoard = () =>
      Array.from({ length: ROWS }, () => Array.from<string | null>({ length: COLS }).fill(null));

    const spawn = (): Piece => {
      const key = nextPiece ?? KEYS[(Math.random() * KEYS.length) | 0]!;
      nextPiece = KEYS[(Math.random() * KEYS.length) | 0]!;
      const shape = SHAPES[key]!;
      return {
        key,
        color: shape.color,
        cells: shape.cells.map((c) => [c[0], c[1]] as [number, number]),
        x: 3,
        y: -1,
      };
    };

    // 4x4 の枠内で時計回りに回転（O は回さない）。
    const rotated = (piece: Piece): [number, number][] =>
      piece.key === "O" ? piece.cells : piece.cells.map((c) => [3 - c[1], c[0]]);

    const collides = (cells: [number, number][], ox: number, oy: number) =>
      cells.some(([cx, cy]) => {
        const x = cx + ox;
        const y = cy + oy;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        return y >= 0 && Boolean(board[y]?.[x]);
      });

    const lock = () => {
      for (const [cx, cy] of current.cells) {
        const y = cy + current.y;
        if (y >= 0) board[y]![cx + current.x] = current.color;
      }

      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y]!.every(Boolean)) {
          board.splice(y, 1);
          board.unshift(Array.from<string | null>({ length: COLS }).fill(null));
          cleared++;
          y++;
        }
      }
      if (cleared) {
        score += [0, 100, 300, 500, 800][cleared]! * level;
        lines += cleared;
        level = 1 + ((lines / 10) | 0);
        dropMs = Math.max(90, 600 - (level - 1) * 45);
      }

      current = spawn();
      if (collides(current.cells, current.x, current.y)) gameOver = true;
      setHud({ score, lines, level });
    };

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
      if (!nextPiece) return;
      const shape = SHAPES[nextPiece]!;
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
          const color = board[y]![x];
          if (color) drawCell(ctx, x, y, color);
        }
      }

      if (current && !gameOver) {
        // ゴースト（落下予測位置）
        let ghostY = current.y;
        while (!collides(current.cells, current.x, ghostY + 1)) ghostY++;
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
      if (gameOver) overlay("GAME OVER", "Rでリスタート");
      else if (paused) overlay("PAUSE", "Pで再開");
    };

    const move = (dx: number) => {
      if (!collides(current.cells, current.x + dx, current.y)) {
        current.x += dx;
        draw();
      }
    };

    const rotate = () => {
      const next = rotated(current);
      for (const kick of [0, -1, 1, -2, 2]) {
        if (!collides(next, current.x + kick, current.y)) {
          current.cells = next;
          current.x += kick;
          draw();
          return;
        }
      }
    };

    const softDrop = () => {
      if (!collides(current.cells, current.x, current.y + 1)) current.y++;
      else lock();
      draw();
    };

    const hardDrop = () => {
      while (!collides(current.cells, current.x, current.y + 1)) current.y++;
      lock();
      draw();
    };

    const loop = (t: number) => {
      rafId = requestAnimationFrame(loop);
      if (gameOver || paused) return;
      if (!lastT) lastT = t;
      dropAcc += t - lastT;
      lastT = t;
      if (dropAcc >= dropMs) {
        dropAcc = 0;
        softDrop();
      }
    };

    const reset = () => {
      board = emptyBoard();
      nextPiece = null;
      score = 0;
      lines = 0;
      level = 1;
      dropMs = 600;
      dropAcc = 0;
      lastT = 0;
      gameOver = false;
      paused = false;
      current = spawn();
      setHud({ score, lines, level });
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
      if (gameOver || paused) return;
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
        <button
          type="button"
          className={PAD_KEY_CLASS}
          onPointerDown={call((a) => a.rotate())}
          aria-label="回転"
        >
          ⟳
        </button>
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
        <button
          type="button"
          className={`${PAD_KEY_CLASS} col-start-2 col-end-4 text-[1.05rem]`}
          onPointerDown={call((a) => a.hardDrop())}
          aria-label="一気に落とす"
        >
          ⤓ 落とす
        </button>
      </div>
      {/* リスタートは誤タップ防止でプレイ用ボタンから離す。 */}
      <button
        type="button"
        className="touch-manipulation rounded-full border border-line bg-transparent px-4 py-1.5 text-[0.8rem] text-muted [-webkit-tap-highlight-color:transparent] active:text-ink"
        onPointerDown={call((a) => a.reset())}
      >
        ↺ リスタート
      </button>
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
    <button
      type="button"
      className={className}
      onPointerDown={(event) => {
        event.preventDefault();
        onPress();
        timers.current.delay = setTimeout(() => {
          timers.current.tick = setInterval(onPress, 70);
        }, 230);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      {...rest}
    >
      {children}
    </button>
  );
}
