// Run: node --experimental-strip-types --test src/game/engine.test.ts
// Or: npx tsx --test src/game/engine.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORIES, COLORS18, isUnlocked } from "./categories.ts";
import { BONUS_WORDS } from "./dictionary.ts";
import {
  classifySelection, generatePuzzle, gridSize, lineBetween, readSelection,
  type Cell, type Puzzle,
} from "./engine.ts";
import * as engine from "./engine.ts";

const EXPECTED_CATEGORIES = [
  ["animals", "Animals", "CAT DOG LION TIGER ELEPHANT GIRAFFE ZEBRA MONKEY PENGUIN DOLPHIN EAGLE WOLF BEAR FOX RABBIT SNAKE TURTLE HORSE"],
  ["food", "Food", "PIZZA BURGER SUSHI PASTA SALAD RICE BREAD SOUP TACO WAFFLE PANCAKE NOODLE STEAK CHEESE COOKIE"],
  ["sports", "Sports", "SOCCER TENNIS BASKETBALL BASEBALL SWIMMING CYCLING BOXING GOLF RUGBY CRICKET HOCKEY RUNNING SKIING SURFING"],
  ["countries", "Countries", "FRANCE JAPAN BRAZIL CANADA INDIA CHINA SPAIN ITALY EGYPT MEXICO RUSSIA AUSTRALIA GERMANY NIGERIA THAILAND"],
  ["colors", "Colors", "RED BLUE GREEN YELLOW PURPLE ORANGE PINK BLACK WHITE BROWN GRAY CYAN GOLD SILVER VIOLET"],
  ["fruits", "Fruits", "APPLE MANGO BANANA GRAPE LEMON PEACH PLUM ORANGE CHERRY MELON PAPAYA GUAVA KIWI PEAR BERRY"],
  ["space", "Space", "MOON STAR SUN PLANET COMET GALAXY NEBULA ASTEROID ORBIT SATURN JUPITER MARS VENUS MERCURY COSMOS"],
  ["ocean-life", "Ocean Life", "SHARK WHALE OCTOPUS CRAB LOBSTER SHRIMP CORAL JELLYFISH SEAHORSE CLAM OTTER SEAL TUNA SQUID"],
  ["music", "Music", "GUITAR PIANO DRUMS VIOLIN TRUMPET FLUTE BASS RHYTHM MELODY CHORD TEMPO JAZZ ROCK BLUES OPERA"],
  ["movies", "Movies", "ACTION DRAMA COMEDY HORROR ROMANCE THRILLER FANTASY MYSTERY WESTERN SEQUEL TRAILER CINEMA ACTOR SCENE"],
  ["nature", "Nature", "FOREST RIVER MOUNTAIN OCEAN DESERT JUNGLE VALLEY ISLAND VOLCANO GLACIER PRAIRIE CANYON MARSH TUNDRA"],
  ["technology", "Technology", "COMPUTER INTERNET ROBOT PHONE TABLET KEYBOARD MONITOR BATTERY CIRCUIT CAMERA LASER SERVER NETWORK SOFTWARE"],
  ["jobs", "Jobs", "DOCTOR TEACHER PILOT CHEF LAWYER NURSE ENGINEER ARTIST FARMER WRITER POLICE FIREFIGHTER ARCHITECT SCIENTIST"],
  ["clothing", "Clothing", "SHIRT PANTS DRESS JACKET SHOES SOCKS HAT SCARF GLOVES BELT BOOTS COAT SKIRT SWEATER SHORTS"],
  ["vegetables", "Vegetables", "CARROT POTATO TOMATO ONION GARLIC PEPPER CORN BROCCOLI SPINACH CABBAGE CELERY RADISH PUMPKIN ZUCCHINI"],
] as const;

const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1],
  [0, 1], [1, -1], [1, 0], [1, 1],
] as const;

function seededRandom(seed: number): () => number {
  return () => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed / 0x1_0000_0000;
  };
}

function assertPuzzle(puzzle: Puzzle, words: string[]): void {
  const normalized = words.map((word) => word.trim().toUpperCase());
  assert.equal(puzzle.size, gridSize(normalized));
  assert.equal(puzzle.grid.length, puzzle.size);
  assert.equal(new Set(puzzle.grid).size, puzzle.size, "grid rows must not alias");
  for (const row of puzzle.grid) {
    assert.equal(row.length, puzzle.size);
    for (const letter of row) assert.match(letter, /^[A-Z]$/);
  }
  assert.deepEqual(Object.keys(puzzle.placements).sort(), [...new Set(normalized)].sort());
  for (const word of new Set(normalized)) {
    const cells = puzzle.placements[word]!;
    assert.equal(cells.length, word.length, word);
    assert.equal(new Set(cells.map(({ row, col }) => `${row},${col}`)).size, word.length);
    for (let i = 0; i < cells.length; i++) {
      const { row, col } = cells[i]!;
      assert.ok(Number.isInteger(row) && row >= 0 && row < puzzle.size);
      assert.ok(Number.isInteger(col) && col >= 0 && col < puzzle.size);
      assert.equal(puzzle.grid[row]![col], word[i], `${word}: letter ${i}`);
      if (i > 0) {
        const dr = cells[1]!.row - cells[0]!.row;
        const dc = cells[1]!.col - cells[0]!.col;
        assert.ok(Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && (dr !== 0 || dc !== 0));
        assert.equal(row, cells[0]!.row + dr * i);
        assert.equal(col, cells[0]!.col + dc * i);
      }
    }
    assert.deepEqual(lineBetween(cells[0]!, cells[cells.length - 1]!), cells);
    assert.equal(readSelection(puzzle, cells), word);
    assert.equal(readSelection(puzzle, [...cells].reverse()), [...word].reverse().join(""));
    for (const selection of [cells, [...cells].reverse()]) {
      assert.deepEqual(classifySelection(puzzle, selection, [], []), {
        kind: "word", word, points: 10,
      });
      assert.deepEqual(classifySelection(puzzle, selection, [word], []), {
        kind: "duplicate", word, points: 0,
      });
    }
  }
}

function rowPuzzle(word: string, target = false): { puzzle: Puzzle; cells: Cell[] } {
  const size = Math.max(3, word.length);
  const grid = Array.from({ length: size }, () => Array<string>(size).fill("X"));
  const cells = Array.from(word, (letter, col) => {
    grid[0]![col] = letter;
    return { row: 0, col };
  });
  return { puzzle: { size, grid, placements: target ? { [word]: cells } : {} }, cells };
}

test("all 15 categories, IDs, and ordered word lists exactly match the specification", () => {
  assert.equal(CATEGORIES.length, 15);
  assert.deepEqual(CATEGORIES.map(({ id, name, words }) => [id, name, words.join(" ")]), EXPECTED_CATEGORIES);
  assert.equal(new Set(CATEGORIES.map(({ id }) => id)).size, 15);
  assert.equal(CATEGORIES[0]!.words.length, 18);
  for (const category of CATEGORIES) {
    assert.match(category.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.equal(typeof category.emoji, "string");
    assert.ok(category.emoji.length > 0);
    assert.ok(COLORS18.includes(category.color));
    assert.equal(new Set(category.words).size, category.words.length);
    for (const word of category.words) assert.match(word, /^[A-Z]+$/);
  }
});

test("COLORS18 contains exactly 18 distinct actual hex colors", () => {
  assert.equal(COLORS18.length, 18);
  assert.equal(new Set(COLORS18.map((color) => color.toUpperCase())).size, 18);
  for (const color of COLORS18) assert.match(color, /^#[\dA-F]{6}$/i);
});

test("bonus dictionary has at least 600 unique English-style three/four-letter entries", (t) => {
  assert.ok(BONUS_WORDS instanceof Set);
  assert.ok(BONUS_WORDS.size >= 600);
  for (const word of BONUS_WORDS) assert.match(word, /^[A-Z]{3,4}$/);
  for (const word of "CAT DOG SUN STAR TREE BIRD FISH BOOK HOME MILK RAIN PLAY WORK LOVE TIME WORD".split(" ")) {
    assert.ok(BONUS_WORDS.has(word), word);
  }
  for (const word of ["", "AT", "AWAKE", "QZX", "ZZZZ", "LOL", "OMG", "BTW", "CPU", "USB", "HTML", "A1B", "CAN'T"]) {
    assert.equal(BONUS_WORDS.has(word), false, word);
  }
  t.diagnostic(`${BONUS_WORDS.size} unique alphabetic words, all length 3 or 4`);
});

test("engine re-exports data and unlock API without duplicate state", () => {
  assert.equal(engine.CATEGORIES, CATEGORIES);
  assert.equal(engine.COLORS18, COLORS18);
  assert.equal(engine.BONUS_WORDS, BONUS_WORDS);
  assert.equal(engine.isUnlocked, isUnlocked);
});

test("gridSize follows exact count boundaries", () => {
  for (const [count, size] of [[0, 8], [1, 8], [11, 8], [12, 10], [15, 10], [16, 12], [100, 12]]) {
    assert.equal(gridSize(Array<string>(count!).fill("CAT")), size, `count ${count}`);
  }
});

test("gridSize follows exact longest-word boundaries and OR precedence", () => {
  for (const [length, size] of [[1, 8], [6, 8], [7, 10], [9, 10], [10, 12], [12, 12], [13, 12]]) {
    assert.equal(gridSize(["A".repeat(length!)]), size, `length ${length}`);
  }
  assert.equal(gridSize([...Array<string>(11).fill("CAT"), "ABCDEFGHIJ"]), 12);
  assert.equal(gridSize([...Array<string>(15).fill("CAT"), "ABCDEFG"]), 12);
  assert.deepEqual(CATEGORIES.map(({ words }) => gridSize(words)), [12, 10, 12, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 10, 10]);
});

test("510 seeded generation runs place every word across every category and all eight directions", (t) => {
  const directions = new Set<string>();
  let placements = 0;
  let runs = 0;
  for (let categoryIndex = 0; categoryIndex < CATEGORIES.length; categoryIndex++) {
    const category = CATEGORIES[categoryIndex]!;
    for (let seed = 0; seed < 34; seed++) {
      const puzzle = generatePuzzle(category.words, seededRandom(1 + categoryIndex * 10_007 + seed * 65_537));
      assertPuzzle(puzzle, category.words);
      for (const cells of Object.values(puzzle.placements)) {
        directions.add(`${cells[1]!.row - cells[0]!.row},${cells[1]!.col - cells[0]!.col}`);
        placements++;
      }
      runs++;
    }
  }
  assert.equal(runs, 510);
  assert.deepEqual([...directions].sort(), DIRECTIONS.map(([dr, dc]) => `${dr},${dc}`).sort());
  t.diagnostic(`${runs} puzzles; ${placements} intact targets checked forward, backward, and as duplicates; all 8 directions`);
});

test("all categories also work with constant low, middle, and high random sources (45 runs)", () => {
  for (const value of [0, 0.5, 1 - Number.EPSILON]) {
    for (const { words } of CATEGORIES) assertPuzzle(generatePuzzle(words, () => value), words);
  }
});

test("seeded generation is reproducible and different seeds vary the puzzle", () => {
  const words = CATEGORIES[0]!.words;
  const first = generatePuzzle(words, seededRandom(42));
  assert.deepEqual(generatePuzzle(words, seededRandom(42)), first);
  assert.notDeepEqual(generatePuzzle(words, seededRandom(43)), first);
});

test("generation does not mutate input and returned puzzles have independent state", () => {
  const words = ["DOG", "ELEPHANT", "CAT"];
  const before = [...words];
  Object.freeze(words);
  const first = generatePuzzle(words, seededRandom(1));
  const second = generatePuzzle(words, seededRandom(1));
  assert.deepEqual(words, before);
  const snapshot = structuredClone(second);
  first.grid[0]![0] = "!";
  first.placements.DOG![0]!.row = -1;
  assert.deepEqual(second, snapshot);
});

test("generation normalizes case and whitespace, and represents duplicate words once", () => {
  const words = [" cat ", "Cat", "dog", "CAT"];
  const puzzle = generatePuzzle(words, seededRandom(9));
  assertPuzzle(puzzle, words);
  assert.deepEqual(Object.keys(puzzle.placements).sort(), ["CAT", "DOG"]);
  assert.equal(generatePuzzle(Array<string>(16).fill("CAT"), seededRandom(9)).size, 12);
});

test("empty input yields a completely filled 8x8 grid with no placements", () => {
  for (const [value, letter] of [[0, "A"], [1 - Number.EPSILON, "Z"]] as const) {
    const puzzle = generatePuzzle([], () => value);
    assertPuzzle(puzzle, []);
    assert.ok(puzzle.grid.flat().every((cell) => cell === letter));
  }
});

test("single-letter words and a word exactly as long as the grid are supported", () => {
  for (const words of [["A", "I"], ["ABCDEFGHIJKL"]]) {
    assertPuzzle(generatePuzzle(words, seededRandom(6)), words);
  }
});

test("invalid word input and words longer than the grid fail explicitly", () => {
  for (const word of ["", " ", "ICE-CREAM", "TWO WORDS", "CAF\u00C9", "123", "ABC1"]) {
    assert.throws(() => generatePuzzle([word], seededRandom(1)), /only English letters/);
  }
  assert.throws(() => generatePuzzle(["ABCDEFGHIJKLM"]), /longer than the 12-cell grid/);
});

test("random sources outside the finite [0, 1) contract are rejected", () => {
  for (const value of [NaN, Infinity, -Infinity, -Number.EPSILON, 1, 2]) {
    assert.throws(() => generatePuzzle(["CAT"], () => value), /Random source/);
    assert.throws(() => generatePuzzle([], () => value), /Random source/);
  }
});

test("dense solvable input can fill every grid cell without losing words", () => {
  const words = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i).repeat(12));
  const puzzle = generatePuzzle(words, seededRandom(7));
  assertPuzzle(puzzle, words);
  const occupied = new Set(Object.values(puzzle.placements).flat().map(({ row, col }) => `${row},${col}`));
  assert.equal(occupied.size, 144);
});

test("impossible packing throws bounded backtracking failure, never a partial puzzle", () => {
  // 13 disjoint-letter words require 156 distinct cells, but the grid has only 144.
  const words = Array.from({ length: 13 }, (_, i) => String.fromCharCode(65 + i).repeat(12));
  assert.throws(() => generatePuzzle(words, seededRandom(7)), /Unable to place all 13 words after 4 bounded backtracking attempts/);
  assertPuzzle(generatePuzzle(["CAT", "DOG"], seededRandom(7)), ["CAT", "DOG"]);
});

test("targets award exactly 10 points regardless of length or selection direction", () => {
  for (const word of ["CAT", "LION", "ELEPHANT"]) {
    const { puzzle, cells } = rowPuzzle(word, true);
    for (const selection of [cells, [...cells].reverse()]) {
      assert.deepEqual(classifySelection(puzzle, selection, [], []), { kind: "word", word, points: 10 });
      assert.deepEqual(classifySelection(puzzle, selection, [word.toLowerCase()], []), {
        kind: "duplicate", word, points: 0,
      });
    }
  }
});

test("bonuses award exactly 5 points in either direction and cannot score twice", () => {
  for (const word of ["SUN", "TREE"]) {
    const { puzzle, cells } = rowPuzzle(word);
    for (const selection of [cells, [...cells].reverse()]) {
      assert.deepEqual(classifySelection(puzzle, selection, [], []), { kind: "bonus", word, points: 5 });
      assert.deepEqual(classifySelection(puzzle, selection, [], [word.toLowerCase()]), {
        kind: "duplicate", word, points: 0,
      });
    }
  }
});

test("a bonus and its reversed dictionary word share one award", () => {
  const { puzzle, cells } = rowPuzzle("STAR");
  const reverse = [...cells].reverse();
  assert.deepEqual(classifySelection(puzzle, cells, [], []), { kind: "bonus", word: "STAR", points: 5 });
  assert.deepEqual(classifySelection(puzzle, reverse, [], []), { kind: "bonus", word: "RATS", points: 5 });
  for (const selection of [cells, reverse]) {
    for (const word of ["STAR", "RATS"]) {
      assert.deepEqual(classifySelection(puzzle, selection, [], [word]), { kind: "duplicate", word, points: 0 });
    }
  }
});

test("a target takes priority over a bonus in both orientations, even after it is found", () => {
  const { puzzle, cells } = rowPuzzle("RATS");
  puzzle.placements.STAR = [...cells].reverse();
  for (const selection of [cells, [...cells].reverse()]) {
    assert.deepEqual(classifySelection(puzzle, selection, [], ["RATS"]), { kind: "word", word: "STAR", points: 10 });
    assert.deepEqual(classifySelection(puzzle, selection, ["STAR"], []), { kind: "duplicate", word: "STAR", points: 0 });
  }
});

test("invalid selections never award points or mutate inputs", () => {
  const { puzzle, cells } = rowPuzzle("CAT", true);
  const found: string[] = [];
  const bonus: string[] = [];
  const snapshot = structuredClone({ puzzle, cells, found, bonus });
  const invalid: Cell[][] = [
    [], [cells[0]!], [cells[0]!, cells[2]!], [cells[0]!, cells[0]!, cells[2]!],
    [cells[0]!, cells[2]!, cells[1]!], [{ row: -1, col: 0 }], [{ row: puzzle.size, col: 0 }],
    [{ row: 0.5, col: 0 }], [{ row: 0, col: NaN }], [{ row: Infinity, col: 0 }],
    lineBetween({ row: 1, col: 0 }, { row: 1, col: 2 }),
  ];
  for (const selection of invalid) {
    const result = classifySelection(puzzle, selection, found, bonus);
    assert.equal(result.kind, "invalid");
    assert.equal(result.points, 0);
  }
  assert.deepEqual({ puzzle, cells, found, bonus }, snapshot);
});
