// 404 ページのブロックパズルの規則。描画とタイマーは BlockPuzzle.tsx が持つ。
// ルール（落下・ライン消去）は一般的な仕組みで、名称・配色・見た目は独自。

type Shape = { color: string; cells: readonly (readonly [number, number])[] };
export type Piece = { key: string; color: string; cells: [number, number][]; x: number; y: number };

export const COLS = 10;
export const ROWS = 20;

const INITIAL_DROP_MS = 600;

// 配色はサイトに合わせたアーストーン。
export const SHAPES: Record<string, Shape> = {
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

export type Hud = { score: number; lines: number; level: number };

export function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array.from<string | null>({ length: COLS }).fill(null));
}

export function createPuzzle({
  random = Math.random,
  onHudChange,
}: {
  random?: () => number;
  /** ピースが固定されたときとリセット時に呼ぶ。 */
  onHudChange?: (hud: Hud) => void;
} = {}) {
  const state = {
    board: emptyBoard(),
    current: undefined as unknown as Piece,
    nextPiece: null as string | null,
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
    dropMs: INITIAL_DROP_MS,
  };

  const pick = () => KEYS[Math.floor(random() * KEYS.length)]!;

  const spawn = (): Piece => {
    const key = state.nextPiece ?? pick();
    state.nextPiece = pick();
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
      return y >= 0 && Boolean(state.board[y]?.[x]);
    });

  const hud = (): Hud => ({ score: state.score, lines: state.lines, level: state.level });

  const lock = () => {
    const { current, board } = state;
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
      state.score += [0, 100, 300, 500, 800][cleared]! * state.level;
      state.lines += cleared;
      state.level = 1 + Math.floor(state.lines / 10);
      state.dropMs = Math.max(90, INITIAL_DROP_MS - (state.level - 1) * 45);
    }

    state.current = spawn();
    if (collides(state.current.cells, state.current.x, state.current.y)) state.gameOver = true;
    onHudChange?.(hud());
  };

  /** 動けたら true。描画し直すかどうかの判断に使う。 */
  const move = (dx: number) => {
    const { current } = state;
    if (collides(current.cells, current.x + dx, current.y)) return false;
    current.x += dx;
    return true;
  };

  /** 壁際では左右に少しずらして回せる位置を探す。 */
  const rotate = () => {
    const { current } = state;
    const next = rotated(current);
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(next, current.x + kick, current.y)) {
        current.cells = next;
        current.x += kick;
        return true;
      }
    }
    return false;
  };

  const softDrop = () => {
    const { current } = state;
    if (!collides(current.cells, current.x, current.y + 1)) current.y++;
    else lock();
  };

  const hardDrop = () => {
    const { current } = state;
    while (!collides(current.cells, current.x, current.y + 1)) current.y++;
    lock();
  };

  /** 今のピースをそのまま落としたときの y（ゴースト表示用）。 */
  const ghostY = () => {
    const { current } = state;
    let y = current.y;
    while (!collides(current.cells, current.x, y + 1)) y++;
    return y;
  };

  const reset = () => {
    state.board = emptyBoard();
    state.nextPiece = null;
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.dropMs = INITIAL_DROP_MS;
    state.gameOver = false;
    state.current = spawn();
    onHudChange?.(hud());
  };

  reset();

  return { state, move, rotate, softDrop, hardDrop, ghostY, reset };
}

export type Puzzle = ReturnType<typeof createPuzzle>;
