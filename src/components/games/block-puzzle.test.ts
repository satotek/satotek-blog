import { describe, expect, it } from "vite-plus/test";

import { COLS, createPuzzle, ROWS, type Hud } from "./block-puzzle";

// Object.keys(SHAPES) is I, O, T, S, Z, J, L, so 0 always picks I.
const alwaysI = () => 0;

function fillRow(board: (string | null)[][], y: number, gapFrom: number, gapTo: number) {
  for (let x = 0; x < COLS; x++) board[y]![x] = x >= gapFrom && x <= gapTo ? null : "#000";
}

describe("block puzzle", () => {
  it("stops a piece at the walls", () => {
    const puzzle = createPuzzle({ random: alwaysI });
    while (puzzle.move(-1));
    expect(puzzle.state.current.x).toBe(0);
    while (puzzle.move(1));
    // The I piece lies in columns 0-3 of its 4x4 frame.
    expect(puzzle.state.current.x).toBe(COLS - 4);
  });

  it("kicks a rotation off the wall instead of refusing it", () => {
    const puzzle = createPuzzle({ random: alwaysI });
    puzzle.rotate();
    while (puzzle.move(1));
    expect(puzzle.rotate()).toBe(true);
    for (const [cx] of puzzle.state.current.cells) {
      expect(cx + puzzle.state.current.x).toBeLessThan(COLS);
    }
  });

  it("clears a full line, scores it by level, and reports the HUD", () => {
    const updates: Hud[] = [];
    const puzzle = createPuzzle({ random: alwaysI, onHudChange: (hud) => updates.push(hud) });
    // Leave exactly the four cells the flat I piece fills at x = 3..6.
    fillRow(puzzle.state.board, ROWS - 1, 3, 6);

    puzzle.hardDrop();

    expect(puzzle.state.lines).toBe(1);
    expect(puzzle.state.score).toBe(100);
    expect(puzzle.state.board[ROWS - 1]!.every((cell) => cell === null)).toBe(true);
    expect(updates.at(-1)).toEqual({ score: 100, lines: 1, level: 1 });
  });

  it("speeds up every ten lines", () => {
    const puzzle = createPuzzle({ random: alwaysI });
    const before = puzzle.state.dropMs;
    for (let i = 0; i < 10; i++) {
      fillRow(puzzle.state.board, ROWS - 1, 3, 6);
      puzzle.hardDrop();
    }
    expect(puzzle.state.level).toBe(2);
    expect(puzzle.state.dropMs).toBeLessThan(before);
  });

  it("ends the game when a new piece cannot enter", () => {
    const puzzle = createPuzzle({ random: alwaysI });
    for (let y = 0; y < ROWS; y++) fillRow(puzzle.state.board, y, 0, 0);
    puzzle.hardDrop();
    expect(puzzle.state.gameOver).toBe(true);
  });

  it("starts over on reset", () => {
    const puzzle = createPuzzle({ random: alwaysI });
    fillRow(puzzle.state.board, ROWS - 1, 3, 6);
    puzzle.hardDrop();
    puzzle.reset();
    expect(puzzle.state).toMatchObject({ score: 0, lines: 0, level: 1, gameOver: false });
    expect(puzzle.state.board.flat().every((cell) => cell === null)).toBe(true);
  });
});
