import { BONUS_WORDS } from "./dictionary.ts";

export { CATEGORIES, COLORS18, isUnlocked } from "./categories.ts";
export { BONUS_WORDS } from "./dictionary.ts";

export interface Cell {
  row: number;
  col: number;
}

export interface Puzzle {
  size: number;
  grid: string[][];
  placements: Record<string, Cell[]>;
}

export interface SelectionResult {
  kind: "word" | "bonus" | "duplicate" | "invalid";
  word: string;
  points: number;
}

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
] as const;

export function gridSize(words: string[]): number {
  const longest = words.reduce((length, word) => Math.max(length, word.length), 0);
  if (words.length >= 16 || longest >= 10) return 12;
  if (words.length >= 12 || longest >= 7) return 10;
  return 8;
}

/** Uppercase keys; repeated words share one placement. Throws instead of omitting words. */
export function generatePuzzle(words: string[], random: () => number = Math.random): Puzzle {
  const normalized = words.map((word) => {
    const value = word.trim();
    if (!/^[a-z]+$/i.test(value)) throw new TypeError("Puzzle words must contain only English letters.");
    return value.toUpperCase();
  });
  const size = gridSize(normalized);
  const ordered = [...new Set(normalized)].sort((a, b) => b.length - a.length);
  if (ordered.some((word) => word.length > size)) {
    throw new RangeError(`Cannot place a word longer than the ${size}-cell grid.`);
  }
  const randomIndex = (length: number): number => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError("Random source must return a finite number in [0, 1).");
    }
    return Math.floor(value * length);
  };
  const candidates = ordered.map((word) => {
    const positions: { row: number; col: number; dr: number; dc: number }[] = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        for (const [dr, dc] of DIRECTIONS) {
          const endRow = row + dr * (word.length - 1);
          const endCol = col + dc * (word.length - 1);
          if (endRow >= 0 && endRow < size && endCol >= 0 && endCol < size) {
            positions.push({ row, col, dr, dc });
          }
        }
      }
    }
    return positions;
  });

  // Budget candidate checks, not just placements, so unsatisfiable input is bounded too.
  const attempts = 4;
  const checksPerAttempt = 300_000;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const grid: string[][] = Array.from({ length: size }, () => Array<string>(size).fill(""));
    const placements: Record<string, Cell[]> = {};
    for (const positions of candidates) {
      for (let i = positions.length - 1; i > 0; i--) {
        const j = randomIndex(i + 1);
        [positions[i], positions[j]] = [positions[j]!, positions[i]!];
      }
    }
    let checksLeft = checksPerAttempt;
    const place = (index: number): boolean => {
      if (index === ordered.length) return true;
      const word = ordered[index]!;
      const available: { row: number; col: number; dr: number; dc: number; overlap: number }[] = [];
      for (const position of candidates[index]!) {
        if (--checksLeft < 0) return false;
        let overlap = 0;
        let fits = true;
        for (let i = 0; i < word.length; i++) {
          const letter = grid[position.row + position.dr * i]![position.col + position.dc * i]!;
          if (letter !== "" && letter !== word[i]) {
            fits = false;
            break;
          }
          if (letter !== "") overlap++;
        }
        if (fits) available.push({ ...position, overlap });
      }
      // Stable sorting preserves shuffled ties while favoring compatible crossings.
      available.sort((a, b) => b.overlap - a.overlap);
      for (const { row, col, dr, dc } of available) {
        const cells: Cell[] = [];
        const written: Cell[] = [];
        for (let i = 0; i < word.length; i++) {
          const cell = { row: row + dr * i, col: col + dc * i };
          cells.push(cell);
          if (grid[cell.row]![cell.col] === "") written.push(cell);
          grid[cell.row]![cell.col] = word[i]!;
        }
        placements[word] = cells;
        if (place(index + 1)) return true;
        delete placements[word];
        // Never erase letters belonging to an earlier, intersecting word.
        for (const cell of written) grid[cell.row]![cell.col] = "";
        if (checksLeft <= 0) return false;
      }
      return false;
    };
    if (!place(0)) continue;
    for (const row of grid) {
      for (let col = 0; col < size; col++) {
        if (row[col] === "") row[col] = String.fromCharCode(65 + randomIndex(26));
      }
    }
    return { size, grid, placements };
  }
  throw new Error(`Unable to place all ${ordered.length} words after ${attempts} bounded backtracking attempts (${checksPerAttempt} candidate checks each).`);
}

/** Inclusive straight line; board bounds are checked by readSelection. */
export function lineBetween(start: Cell, end: Cell): Cell[] {
  if (![start.row, start.col, end.row, end.col].every(Number.isSafeInteger)) return [];
  const dr = end.row - start.row;
  const dc = end.col - start.col;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return [];
  return Array.from({ length: Math.max(Math.abs(dr), Math.abs(dc)) + 1 }, (_, i) => ({
    row: start.row + Math.sign(dr) * i,
    col: start.col + Math.sign(dc) * i,
  }));
}

/** Reads in the supplied order. Invalid or out-of-bounds cells produce an empty string. */
export function readSelection(puzzle: Puzzle, cells: Cell[]): string {
  let word = "";
  for (const { row, col } of cells) {
    if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= puzzle.size || col >= puzzle.size) return "";
    const letter = puzzle.grid[row]?.[col];
    if (typeof letter !== "string" || !/^[a-z]$/i.test(letter)) return "";
    word += letter;
  }
  return word;
}

/** Targets score 10 points, bonuses 5. Does not mutate puzzle or progress arrays. */
export function classifySelection(puzzle: Puzzle, cells: Cell[], found: string[], bonus: string[]): SelectionResult {
  const selected = readSelection(puzzle, cells).toUpperCase();
  if (!selected || cells.length === 0) return { kind: "invalid", word: "", points: 0 };
  const line = lineBetween(cells[0]!, cells[cells.length - 1]!);
  if (line.length !== cells.length || line.some((cell, i) => cell.row !== cells[i]!.row || cell.col !== cells[i]!.col)) {
    return { kind: "invalid", word: selected, points: 0 };
  }
  const orientations = [selected, [...selected].reverse().join("")];
  // Both orientations get target priority, even when the other spelling is a bonus.
  for (const word of orientations) {
    if (Object.prototype.hasOwnProperty.call(puzzle.placements, word)) {
      return found.some((entry) => entry.toUpperCase() === word)
        ? { kind: "duplicate", word, points: 0 }
        : { kind: "word", word, points: 10 };
    }
  }
  const word = orientations.find((candidate) => BONUS_WORDS.has(candidate));
  if (!word) return { kind: "invalid", word: selected, points: 0 };
  // A bonus and its reversal cannot be scored twice, including pairs like STAR/RATS.
  const previous = bonus.find((entry) => orientations.includes(entry.toUpperCase()));
  return previous
    ? { kind: "duplicate", word: previous.toUpperCase(), points: 0 }
    : { kind: "bonus", word, points: 5 };
}
