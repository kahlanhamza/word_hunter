import { CATEGORIES, isUnlocked } from "./categories.ts";
import { classifySelection, generatePuzzle, type Cell, type Puzzle } from "./engine.ts";

export type Mode = "classic" | "time";

export type Progress = {
  version: 1;
  coins: number;
  completedLevels: string[];
  soundEnabled: boolean;
};

export type Round = {
  id: string;
  categoryIndex: number;
  mode: Mode;
  puzzle: Puzzle;
  found: string[];
  bonus: string[];
  paths: Record<string, Cell[]>;
  hints: number;
  elapsedMs: number;
  status: "playing" | "won" | "lost";
  score: number;
  timeBonus: number;
};

export type GameState = { progress: Progress; round: Round | null };

type Action =
  | { type: "start"; round: Round }
  | { type: "select"; cells: Cell[] }
  | { type: "elapse"; ms: number }
  | { type: "hint" }
  | { type: "reward-hint"; roundId: string }
  | { type: "sound"; enabled: boolean }
  | { type: "leave" }
  | { type: "hydrate"; progress: Progress };

const ROUND_MS = 120_000;

export function defaultProgress(): Progress {
  return { version: 1, coins: 0, completedLevels: [], soundEnabled: true };
}

function validateProgress(value: unknown): Progress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultProgress();
  const progress = value as Record<string, unknown>;
  if (
    progress.version !== 1 ||
    typeof progress.coins !== "number" || !Number.isSafeInteger(progress.coins) || progress.coins < 0 ||
    typeof progress.soundEnabled !== "boolean" ||
    !Array.isArray(progress.completedLevels) ||
    !progress.completedLevels.every((id) => typeof id === "string")
  ) return defaultProgress();
  const validIds = new Set(CATEGORIES.map(({ id }) => id));
  return {
    version: 1,
    coins: progress.coins,
    completedLevels: [...new Set(progress.completedLevels.filter((id) => validIds.has(id)))],
    soundEnabled: progress.soundEnabled,
  };
}

export function restoreProgress(raw: string | null): Progress {
  if (typeof raw !== "string") return defaultProgress();
  try {
    return validateProgress(JSON.parse(raw));
  } catch {
    return defaultProgress();
  }
}

export function createRound(categoryIndex: number, mode: Mode, completed: string[], id?: string): Round {
  if (!Number.isInteger(categoryIndex) || categoryIndex < 0 || categoryIndex >= CATEGORIES.length) {
    throw new RangeError("Invalid category index.");
  }
  if (mode !== "classic" && mode !== "time") throw new TypeError("Invalid game mode.");
  if (!Array.isArray(completed) || !completed.every((entry) => typeof entry === "string")) {
    throw new TypeError("Completed levels must be an array of category IDs.");
  }
  if (!isUnlocked(categoryIndex, completed)) throw new Error("Category is locked.");
  if (id !== undefined && (typeof id !== "string" || id.trim() === "")) {
    throw new TypeError("Round ID must be a nonempty string.");
  }
  return {
    id: id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    categoryIndex,
    mode,
    puzzle: generatePuzzle(CATEGORIES[categoryIndex]!.words),
    found: [],
    bonus: [],
    paths: {},
    hints: 3,
    elapsedMs: 0,
    status: "playing",
    score: 0,
    timeBonus: 0,
  };
}

export function remainingSeconds(round: Round): number {
  return Math.max(0, Math.min(120, Math.ceil((ROUND_MS - round.elapsedMs) / 1_000)));
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "start":
      return { ...state, round: action.round };
    case "leave":
      return state.round ? { ...state, round: null } : state;
    case "sound":
      return typeof action.enabled === "boolean" && action.enabled !== state.progress.soundEnabled
        ? { ...state, progress: { ...state.progress, soundEnabled: action.enabled } }
        : state;
    case "hydrate":
      return { ...state, progress: validateProgress(action.progress) };
  }

  const round = state.round;
  if (!round || round.status !== "playing") return state;

  switch (action.type) {
    case "select": {
      const result = classifySelection(round.puzzle, action.cells, round.found, round.bonus);
      if (result.kind === "invalid" || result.kind === "duplicate") return state;
      if (result.kind === "bonus") {
        return {
          ...state,
          round: { ...round, bonus: [...round.bonus, result.word], score: round.score + result.points },
        };
      }
      const found = [...round.found, result.word];
      const won = Object.keys(round.puzzle.placements).every((word) => found.includes(word));
      const timeBonus = won && round.mode === "time" ? remainingSeconds(round) * 2 : 0;
      const categoryId = CATEGORIES[round.categoryIndex]!.id;
      return {
        progress: won ? {
          ...state.progress,
          coins: Math.min(Number.MAX_SAFE_INTEGER, state.progress.coins + 50),
          completedLevels: state.progress.completedLevels.includes(categoryId)
            ? state.progress.completedLevels
            : [...state.progress.completedLevels, categoryId],
        } : state.progress,
        round: {
          ...round,
          found,
          paths: { ...round.paths, [result.word]: action.cells.map((cell) => ({ ...cell })) },
          status: won ? "won" : "playing",
          score: round.score + result.points + timeBonus,
          timeBonus,
        },
      };
    }
    case "elapse": {
      if (!Number.isFinite(action.ms) || action.ms <= 0) return state;
      const elapsedMs = Math.min(round.mode === "time" ? ROUND_MS : Number.MAX_SAFE_INTEGER, round.elapsedMs + action.ms);
      if (elapsedMs === round.elapsedMs) return state;
      return {
        ...state,
        round: { ...round, elapsedMs, status: round.mode === "time" && elapsedMs >= ROUND_MS ? "lost" : "playing" },
      };
    }
    case "hint":
      return round.hints > 0 ? { ...state, round: { ...round, hints: round.hints - 1 } } : state;
    case "reward-hint":
      return action.roundId === round.id ? { ...state, round: { ...round, hints: round.hints + 1 } } : state;
    default:
      return state;
  }
}
