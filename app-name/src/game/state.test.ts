// Run: node --experimental-strip-types --test src/game/engine.test.ts src/game/state.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORIES, isUnlocked } from "./categories.ts";
import { lineBetween, readSelection, type Cell } from "./engine.ts";
import {
  createRound, defaultProgress, reducer, remainingSeconds, restoreProgress,
  type GameState, type Mode, type Progress,
} from "./state.ts";

type Action = Parameters<typeof reducer>[1];

function rowCells(row: number, length: number): Cell[] {
  return lineBetween({ row, col: 0 }, { row, col: length - 1 });
}

function fixture(mode: Mode = "classic", id = "round-a"): GameState {
  return {
    progress: defaultProgress(),
    round: {
      id, categoryIndex: 0, mode,
      puzzle: {
        size: 8,
        grid: ["CATXXXXX", "DOGXXXXX", "SUNXXXXX", "STARXXXX", "RATSXXXX", "CATXXXXX", "ELEPHANT", "XXXXXXXX"].map((row) => [...row]),
        placements: { CAT: rowCells(0, 3), DOG: rowCells(1, 3), ELEPHANT: rowCells(6, 8) },
      },
      found: [], bonus: [], paths: {}, hints: 3, elapsedMs: 0,
      status: "playing", score: 0, timeBonus: 0,
    },
  };
}

function finish(state: GameState): GameState {
  for (const cells of Object.values(state.round!.puzzle.placements)) {
    state = reducer(state, { type: "select", cells });
  }
  return state;
}

function freeze(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const child of Object.values(value)) freeze(child);
  Object.freeze(value);
}

test("default progress has independent empty completion lists", () => {
  const first = defaultProgress();
  const second = defaultProgress();
  assert.deepEqual(first, { version: 1, coins: 0, completedLevels: [], soundEnabled: true });
  assert.notEqual(first, second);
  assert.notEqual(first.completedLevels, second.completedLevels);
  first.completedLevels.push("animals");
  assert.deepEqual(second.completedLevels, []);
});

test("restoreProgress retains valid progress but never restores a round or extra fields", () => {
  for (const coins of [0, 75, Number.MAX_SAFE_INTEGER]) {
    const progress: Progress = { version: 1, coins, completedLevels: ["animals", "food"], soundEnabled: false };
    assert.deepEqual(restoreProgress(JSON.stringify({ ...progress, round: fixture().round, extra: true })), progress);
  }
});

test("restored completion IDs are whitelisted and deduplicated without inventing earlier completions", () => {
  assert.deepEqual(restoreProgress(JSON.stringify({
    ...defaultProgress(), coins: 20,
    completedLevels: ["sports", "sports", "unknown", "ANIMALS", "", "__proto__", "food", "ocean-life"],
  })), { version: 1, coins: 20, completedLevels: ["sports", "food", "ocean-life"], soundEnabled: true });
});

test("corrupt JSON, wrong versions, wrong field types, and unsafe coins fall back to defaults", () => {
  const invalidFields = [
    { version: 0 }, { version: 2 }, { version: "1" }, { version: null },
    { coins: -1 }, { coins: 0.5 }, { coins: Number.MAX_SAFE_INTEGER + 1 },
    { coins: "50" }, { coins: null }, { coins: NaN }, { coins: Infinity }, { coins: true },
    { completedLevels: null }, { completedLevels: "animals" }, { completedLevels: {} },
    { completedLevels: ["animals", 1] }, { completedLevels: [null] }, { completedLevels: [[]] },
    { soundEnabled: "false" }, { soundEnabled: 0 }, { soundEnabled: null },
  ];
  const rawValues: (string | null)[] = [null, "", " ", "{broken", "null", "[]", "true", "42", '"text"', "{}"];
  for (const field of invalidFields) rawValues.push(JSON.stringify({ ...defaultProgress(), ...field }));
  for (const key of Object.keys(defaultProgress())) {
    const incomplete: Record<string, unknown> = { ...defaultProgress() };
    delete incomplete[key];
    rawValues.push(JSON.stringify(incomplete));
  }
  rawValues.push('{"version":1,"coins":1e309,"completedLevels":[],"soundEnabled":true}');
  for (const raw of rawValues) assert.deepEqual(restoreProgress(raw), defaultProgress(), String(raw));
});

test("createRound generates every target and initializes both modes with independent state", () => {
  for (const mode of ["classic", "time"] as const) {
    const round = createRound(0, mode, [], `initial-${mode}`);
    assert.equal(round.id, `initial-${mode}`);
    assert.equal(round.categoryIndex, 0);
    assert.equal(round.mode, mode);
    assert.equal(round.status, "playing");
    assert.equal(round.hints, 3);
    assert.equal(round.elapsedMs, 0);
    assert.equal(round.score, 0);
    assert.equal(round.timeBonus, 0);
    assert.deepEqual(round.found, []);
    assert.deepEqual(round.bonus, []);
    assert.deepEqual(round.paths, {});
    assert.deepEqual(Object.keys(round.puzzle.placements).sort(), [...CATEGORIES[0]!.words].sort());
    for (const [word, cells] of Object.entries(round.puzzle.placements)) {
      assert.equal(readSelection(round.puzzle, cells), word);
    }
  }
  const first = createRound(0, "classic", []);
  const second = createRound(0, "classic", []);
  assert.ok(first.id.length > 0);
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.puzzle, second.puzzle);
  assert.notEqual(first.found, second.found);
  assert.notEqual(first.bonus, second.bonus);
  assert.notEqual(first.paths, second.paths);
});

test("createRound rejects invalid category indices, modes, completion lists, and IDs", () => {
  for (const index of [-1, CATEGORIES.length, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => createRound(index, "classic", []), /Invalid category index/);
  }
  assert.throws(() => createRound("0" as unknown as number, "classic", []), /Invalid category index/);
  for (const mode of ["", "timed", "CLASSIC", null, 0]) {
    assert.throws(() => createRound(0, mode as Mode, []), /Invalid game mode/);
  }
  for (const completed of [null, "animals", {}, [1], ["animals", null]]) {
    assert.throws(() => createRound(1, "classic", completed as string[]), /Completed levels/);
  }
  for (const id of ["", " ", null, 42]) {
    assert.throws(() => createRound(0, "classic", [], id as string), /Round ID/);
  }
});

test("every locked category requires its immediate predecessor, not itself or unknown IDs", () => {
  for (let index = 1; index < CATEGORIES.length; index++) {
    const category = CATEGORIES[index]!;
    for (const completed of [[], [category.id], ["unknown"], [CATEGORIES[index - 1]!.id.toUpperCase()]]) {
      assert.throws(() => createRound(index, "classic", completed), /locked/);
    }
    const completed = [CATEGORIES[index - 1]!.id];
    const snapshot = [...completed];
    Object.freeze(completed);
    assert.equal(createRound(index, "time", completed).categoryIndex, index);
    assert.deepEqual(completed, snapshot);
  }
});

test("remainingSeconds rounds upward and clamps to the 0 through 120 range", () => {
  const round = fixture("time").round!;
  for (const [elapsedMs, seconds] of [
    [-1_000, 120], [0, 120], [0.5, 120], [999, 120], [1_000, 119],
    [1_001, 119], [118_999, 2], [119_000, 1], [119_999.5, 1], [120_000, 0], [150_000, 0],
  ] as const) {
    assert.equal(remainingSeconds({ ...round, elapsedMs }), seconds, `elapsed ${elapsedMs}`);
  }
});

test("targets add exactly 10 in either direction and preserve the actual selected path", () => {
  for (const reverse of [false, true]) {
    const initial = fixture();
    const before = structuredClone(initial);
    freeze(initial);
    // This is a second CAT occurrence, not the generator's canonical placement.
    const cells = rowCells(5, 3);
    if (reverse) cells.reverse();
    const selected = structuredClone(cells);
    const state = reducer(initial, { type: "select", cells });
    assert.equal(state.round!.score, 10);
    assert.deepEqual(state.round!.found, ["CAT"]);
    assert.deepEqual(state.round!.paths, { CAT: selected });
    assert.notEqual(state.round!.paths.CAT, cells);
    assert.notEqual(state.round!.paths.CAT![0], cells[0]);
    assert.equal(state.progress, initial.progress);
    assert.deepEqual(initial, before);
    cells[0]!.row = 7;
    assert.deepEqual(state.round!.paths.CAT, selected);
    for (const duplicate of [rowCells(0, 3), rowCells(5, 3).reverse()]) {
      assert.equal(reducer(state, { type: "select", cells: duplicate }), state);
    }
    const longer = reducer(state, { type: "select", cells: rowCells(6, 8) });
    assert.equal(longer.round!.score, 20);
    assert.deepEqual(longer.round!.paths.CAT, selected);
    assert.deepEqual(longer.round!.paths.ELEPHANT, rowCells(6, 8));
  }
});

test("bonuses add exactly 5 in either direction without targets, paths, coins, or unlocks", () => {
  for (const reverse of [false, true]) {
    const initial = fixture();
    const cells = rowCells(2, 3);
    if (reverse) cells.reverse();
    const state = reducer(initial, { type: "select", cells });
    assert.equal(state.round!.score, 5);
    assert.deepEqual(state.round!.bonus, ["SUN"]);
    assert.equal(state.round!.found, initial.round!.found);
    assert.equal(state.round!.paths, initial.round!.paths);
    assert.equal(state.progress, initial.progress);
    assert.equal(state.round!.status, "playing");
    assert.equal(reducer(state, { type: "select", cells }), state);
    assert.equal(reducer(state, { type: "select", cells: [...cells].reverse() }), state);
  }
});

test("reverse bonus dictionary pairs and different occurrences cannot be collected twice", () => {
  for (const cells of [rowCells(3, 4), rowCells(3, 4).reverse(), rowCells(4, 4)]) {
    const state = reducer(fixture(), { type: "select", cells });
    assert.equal(state.round!.score, 5);
    assert.equal(state.round!.bonus.length, 1);
    for (const duplicate of [rowCells(3, 4), rowCells(3, 4).reverse(), rowCells(4, 4), rowCells(4, 4).reverse()]) {
      assert.equal(reducer(state, { type: "select", cells: duplicate }), state);
    }
  }
});

test("empty, non-straight, repeated, unknown, and out-of-bounds selections have no effect", () => {
  const state = fixture();
  const invalid: Cell[][] = [
    [], [{ row: -1, col: 0 }], [{ row: 8, col: 0 }], [{ row: 0, col: 8 }],
    [{ row: NaN, col: 0 }], [{ row: 0, col: Infinity }], [{ row: 0.5, col: 0 }],
    [{ row: 0, col: 0 }, { row: 0, col: 2 }],
    [{ row: 0, col: 0 }, { row: 0, col: 0 }, { row: 0, col: 2 }],
    [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 0, col: 1 }], rowCells(7, 3),
  ];
  freeze(state);
  for (const cells of invalid) assert.equal(reducer(state, { type: "select", cells }), state);
});

test("the final target atomically wins, awards 50 coins, and unlocks the next category once", () => {
  let state = fixture();
  state.progress.coins = 7;
  state = reducer(state, { type: "select", cells: rowCells(2, 3) });
  state = reducer(state, { type: "select", cells: rowCells(0, 3) });
  state = reducer(state, { type: "select", cells: rowCells(1, 3).reverse() });
  assert.equal(state.round!.status, "playing");
  assert.equal(state.round!.score, 25);
  assert.equal(state.progress.coins, 7);
  assert.deepEqual(state.progress.completedLevels, []);
  assert.equal(isUnlocked(1, state.progress.completedLevels), false);
  const before = structuredClone(state);
  freeze(state);
  const won = reducer(state, { type: "select", cells: rowCells(6, 8) });
  assert.deepEqual(state, before);
  assert.equal(won.round!.status, "won");
  assert.equal(won.round!.score, 35);
  assert.equal(won.round!.timeBonus, 0);
  assert.deepEqual(won.round!.found, ["CAT", "DOG", "ELEPHANT"]);
  assert.deepEqual(Object.keys(won.round!.paths), won.round!.found);
  assert.equal(won.progress.coins, 57);
  assert.deepEqual(won.progress.completedLevels, ["animals"]);
  assert.equal(isUnlocked(1, won.progress.completedLevels), true);
  for (let i = 0; i < 5; i++) {
    assert.equal(finish(won), won);
    assert.equal(reducer(won, { type: "elapse", ms: 120_000 }), won);
    assert.equal(reducer(won, { type: "hint" }), won);
    assert.equal(reducer(won, { type: "reward-hint", roundId: won.round!.id }), won);
  }
});

test("time mode adds exactly twice the remaining rounded-up seconds on winning, only once", () => {
  for (const elapsedMs of [0, 1_001, 119_000, 119_999.5]) {
    let state = reducer(fixture("time"), { type: "elapse", ms: elapsedMs });
    state = reducer(state, { type: "select", cells: rowCells(2, 3) });
    state = reducer(state, { type: "select", cells: rowCells(0, 3) });
    assert.equal(state.round!.timeBonus, 0);
    assert.equal(state.round!.score, 15);
    const bonus = Math.ceil((120_000 - elapsedMs) / 1_000) * 2;
    const won = finish(state);
    assert.equal(won.round!.status, "won");
    assert.equal(won.round!.timeBonus, bonus);
    assert.equal(won.round!.score, 35 + bonus);
    assert.equal(won.round!.elapsedMs, elapsedMs);
    assert.equal(won.progress.coins, 50);
    assert.deepEqual(won.progress.completedLevels, ["animals"]);
    assert.equal(finish(won), won);
    assert.equal(reducer(won, { type: "elapse", ms: 1_000 }), won);
  }
});

test("every category can be fully completed and sequentially unlocked in both modes", () => {
  for (const mode of ["classic", "time"] as const) {
    let state: GameState = { progress: defaultProgress(), round: null };
    for (let index = 0; index < CATEGORIES.length; index++) {
      const round = createRound(index, mode, state.progress.completedLevels, `${mode}-${index}`);
      const previousProgress = state.progress;
      state = reducer(state, { type: "start", round });
      assert.equal(state.progress, previousProgress);
      const targets = Object.entries(round.puzzle.placements);
      for (let targetIndex = 0; targetIndex < targets.length; targetIndex++) {
        const [word, cells] = targets[targetIndex]!;
        const selection = targetIndex % 2 ? [...cells].reverse() : cells;
        state = reducer(state, { type: "select", cells: selection });
        assert.ok(state.round!.found.includes(word));
        assert.deepEqual(state.round!.paths[word], selection);
        if (targetIndex < targets.length - 1) {
          assert.equal(state.round!.status, "playing");
          assert.equal(state.progress, previousProgress);
          assert.equal(state.round!.score, (targetIndex + 1) * 10);
        }
      }
      assert.equal(state.round!.status, "won");
      assert.equal(state.round!.timeBonus, mode === "time" ? 240 : 0);
      assert.equal(state.round!.score, targets.length * 10 + (mode === "time" ? 240 : 0));
      assert.equal(state.progress.coins, (index + 1) * 50);
      assert.deepEqual(state.progress.completedLevels, CATEGORIES.slice(0, index + 1).map(({ id }) => id));
      assert.equal(finish(state), state);
    }
    assert.equal(state.progress.completedLevels.length, 15);
    assert.equal(state.progress.coins, 750);
  }
});

test("a new replay earns one new round reward without duplicating the completed category", () => {
  const first = finish(fixture());
  const replay = reducer(first, { type: "start", round: fixture("classic", "replay").round! });
  const second = finish(replay);
  assert.equal(second.progress.coins, 100);
  assert.deepEqual(second.progress.completedLevels, ["animals"]);
  assert.equal(second.progress.completedLevels, first.progress.completedLevels);
  assert.equal(finish(second), second);
});

test("timeout loses at the deadline, preserves earned points, and never rewards or unlocks", () => {
  for (const ms of [120_000, 120_001, Number.MAX_VALUE]) {
    let state = reducer(fixture("time"), { type: "select", cells: rowCells(0, 3) });
    state = reducer(state, { type: "select", cells: rowCells(2, 3) });
    const before = structuredClone(state);
    freeze(state);
    const lost = reducer(state, { type: "elapse", ms });
    assert.deepEqual(state, before);
    assert.equal(lost.round!.status, "lost");
    assert.equal(lost.round!.elapsedMs, 120_000);
    assert.equal(remainingSeconds(lost.round!), 0);
    assert.equal(lost.round!.score, 15);
    assert.equal(lost.round!.timeBonus, 0);
    assert.equal(lost.round!.paths, state.round!.paths);
    assert.equal(lost.progress, state.progress);
    assert.equal(lost.progress.coins, 0);
    assert.deepEqual(lost.progress.completedLevels, []);
    assert.equal(isUnlocked(1, lost.progress.completedLevels), false);
    assert.equal(finish(lost), lost);
    assert.equal(reducer(lost, { type: "hint" }), lost);
    assert.equal(reducer(lost, { type: "reward-hint", roundId: lost.round!.id }), lost);
    assert.equal(reducer(lost, { type: "elapse", ms: 1 }), lost);
  }
});

test("the last fractional millisecond remains playable but reaching the deadline blocks completion", () => {
  const state = reducer(fixture("time"), { type: "elapse", ms: 119_999.5 });
  assert.equal(state.round!.status, "playing");
  assert.equal(finish(state).round!.timeBonus, 2);
  const lost = reducer(state, { type: "elapse", ms: 0.5 });
  assert.equal(lost.round!.status, "lost");
  assert.equal(finish(lost), lost);
});

test("classic rounds accumulate elapsed time without timeout or a time bonus", () => {
  let state = reducer(fixture(), { type: "elapse", ms: 120_000 });
  state = reducer(state, { type: "elapse", ms: 0.25 });
  assert.equal(state.round!.elapsedMs, 120_000.25);
  assert.equal(state.round!.status, "playing");
  const won = finish(state);
  assert.equal(won.round!.score, 30);
  assert.equal(won.round!.timeBonus, 0);
  assert.equal(won.progress.coins, 50);
});

test("invalid timer deltas do not advance or rewind either mode", () => {
  for (const mode of ["classic", "time"] as const) {
    const state = reducer(fixture(mode), { type: "elapse", ms: 100.5 });
    for (const ms of [0, -1, -0.5, NaN, Infinity, -Infinity, "100", null, undefined]) {
      assert.equal(reducer(state, { type: "elapse", ms: ms as number }), state);
    }
    assert.equal(state.round!.elapsedMs, 100.5);
  }
});

test("hints spend only the available budget and do not change gameplay or progress", () => {
  let state = fixture();
  for (const hints of [2, 1, 0]) {
    freeze(state);
    const previous = state;
    state = reducer(state, { type: "hint" });
    assert.deepEqual(state.round, { ...previous.round, hints });
    assert.equal(state.progress, previous.progress);
  }
  assert.equal(reducer(state, { type: "hint" }), state);
  const rewarded = reducer(state, { type: "reward-hint", roundId: state.round!.id });
  assert.deepEqual(rewarded.round, { ...state.round, hints: 1 });
  assert.equal(rewarded.progress, state.progress);
  const spent = reducer(rewarded, { type: "hint" });
  assert.equal(spent.round!.hints, 0);
  assert.equal(reducer(spent, { type: "hint" }), spent);
});

test("a delayed native hint reward cannot affect a different round or a left puzzle", () => {
  const old = fixture("classic", "old");
  const pendingReward: Action = { type: "reward-hint", roundId: "old" };
  assert.equal(reducer(old, { type: "reward-hint", roundId: "other" }), old);
  const current = reducer(old, { type: "start", round: fixture("classic", "new").round! });
  assert.equal(reducer(current, pendingReward), current);
  const valid = reducer(current, { type: "reward-hint", roundId: "new" });
  assert.equal(valid.round!.hints, current.round!.hints + 1);
  const left = reducer(old, { type: "leave" });
  assert.equal(reducer(left, pendingReward), left);
});

test("start, leave, sound, and hydrate remain available when idle, won, or lost", () => {
  const states: GameState[] = [
    { progress: defaultProgress(), round: null }, finish(fixture()),
    reducer(fixture("time"), { type: "elapse", ms: 120_000 }),
  ];
  for (const state of states) {
    const snapshot = structuredClone(state);
    freeze(state);
    const silent = reducer(state, { type: "sound", enabled: false });
    assert.equal(silent.round, state.round);
    assert.deepEqual(silent.progress, { ...state.progress, soundEnabled: false });
    assert.equal(reducer(silent, { type: "sound", enabled: false }), silent);
    assert.equal(reducer(silent, { type: "sound", enabled: "yes" as unknown as boolean }), silent);
    const progress: Progress = { version: 1, coins: 90, completedLevels: ["animals"], soundEnabled: false };
    const hydrated = reducer(state, { type: "hydrate", progress });
    assert.deepEqual(hydrated.progress, progress);
    assert.equal(hydrated.round, state.round);
    assert.notEqual(hydrated.progress.completedLevels, progress.completedLevels);
    const nextRound = fixture("time", "replacement").round!;
    const restarted = reducer(state, { type: "start", round: nextRound });
    assert.equal(restarted.round, nextRound);
    assert.equal(restarted.progress, state.progress);
    const left = reducer(state, { type: "leave" });
    assert.equal(left.round, null);
    assert.equal(left.progress, state.progress);
    assert.equal(reducer(left, { type: "leave" }), left);
    assert.deepEqual(state, snapshot);
  }
});

test("hydrate applies the same storage validation without replacing the current round", () => {
  const state = fixture();
  const valid = { ...defaultProgress(), completedLevels: ["food", "unknown", "food"] };
  assert.deepEqual(reducer(state, { type: "hydrate", progress: valid }).progress.completedLevels, ["food"]);
  const hydrated = reducer(state, { type: "hydrate", progress: { ...defaultProgress(), coins: -50 } });
  assert.deepEqual(hydrated.progress, defaultProgress());
  assert.equal(hydrated.round, state.round);
});

test("all gameplay actions are ignored without a round, and no cheat action is accepted", () => {
  const idle: GameState = { progress: defaultProgress(), round: null };
  const actions: Action[] = [
    { type: "select", cells: rowCells(0, 3) }, { type: "elapse", ms: 100 },
    { type: "hint" }, { type: "reward-hint", roundId: "round-a" },
  ];
  for (const action of actions) assert.equal(reducer(idle, action), idle);
  const playing = fixture();
  for (const type of ["win", "complete", "finish", "cheat", "reward"]) {
    assert.equal(reducer(playing, { type } as unknown as Action), playing);
  }
});

test("coin rewards and long classic timers cannot overflow safe integer state", () => {
  const state = fixture();
  state.progress.coins = Number.MAX_SAFE_INTEGER - 10;
  const won = finish(state);
  assert.equal(won.progress.coins, Number.MAX_SAFE_INTEGER);
  assert.deepEqual(restoreProgress(JSON.stringify(won.progress)), won.progress);
  const elapsed = reducer(fixture(), { type: "elapse", ms: Number.MAX_VALUE });
  assert.equal(elapsed.round!.elapsedMs, Number.MAX_SAFE_INTEGER);
  assert.equal(elapsed.round!.status, "playing");
  assert.equal(reducer(elapsed, { type: "elapse", ms: Number.MAX_VALUE }), elapsed);
});
