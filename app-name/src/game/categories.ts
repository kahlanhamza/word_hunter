export interface Category {
  id: string;
  name: string;
  emoji: string;
  words: string[];
  color: string;
}

export const COLORS18: string[] = [
  "#E45756", "#F28E2B", "#D4A017", "#76A641", "#299E73", "#168B91",
  "#3696C5", "#4775D1", "#6960CC", "#9163CB", "#BB5DA9", "#D85D87",
  "#BD6C45", "#8D7958", "#668C80", "#537D9B", "#A777AB", "#B47B86",
];

export const CATEGORIES: Category[] = [
  {
    id: "animals", name: "Animals", emoji: "\u{1F43E}", color: COLORS18[0]!,
    words: "CAT DOG LION TIGER ELEPHANT GIRAFFE ZEBRA MONKEY PENGUIN DOLPHIN EAGLE WOLF BEAR FOX RABBIT SNAKE TURTLE HORSE".split(" "),
  },
  {
    id: "food", name: "Food", emoji: "\u{1F355}", color: COLORS18[1]!,
    words: "PIZZA BURGER SUSHI PASTA SALAD RICE BREAD SOUP TACO WAFFLE PANCAKE NOODLE STEAK CHEESE COOKIE".split(" "),
  },
  {
    id: "sports", name: "Sports", emoji: "\u26BD", color: COLORS18[2]!,
    words: "SOCCER TENNIS BASKETBALL BASEBALL SWIMMING CYCLING BOXING GOLF RUGBY CRICKET HOCKEY RUNNING SKIING SURFING".split(" "),
  },
  {
    id: "countries", name: "Countries", emoji: "\u{1F30D}", color: COLORS18[3]!,
    words: "FRANCE JAPAN BRAZIL CANADA INDIA CHINA SPAIN ITALY EGYPT MEXICO RUSSIA AUSTRALIA GERMANY NIGERIA THAILAND".split(" "),
  },
  {
    id: "colors", name: "Colors", emoji: "\u{1F3A8}", color: COLORS18[4]!,
    words: "RED BLUE GREEN YELLOW PURPLE ORANGE PINK BLACK WHITE BROWN GRAY CYAN GOLD SILVER VIOLET".split(" "),
  },
  {
    id: "fruits", name: "Fruits", emoji: "\u{1F34E}", color: COLORS18[5]!,
    words: "APPLE MANGO BANANA GRAPE LEMON PEACH PLUM ORANGE CHERRY MELON PAPAYA GUAVA KIWI PEAR BERRY".split(" "),
  },
  {
    id: "space", name: "Space", emoji: "\u{1F680}", color: COLORS18[6]!,
    words: "MOON STAR SUN PLANET COMET GALAXY NEBULA ASTEROID ORBIT SATURN JUPITER MARS VENUS MERCURY COSMOS".split(" "),
  },
  {
    id: "ocean-life", name: "Ocean Life", emoji: "\u{1F40B}", color: COLORS18[7]!,
    words: "SHARK WHALE OCTOPUS CRAB LOBSTER SHRIMP CORAL JELLYFISH SEAHORSE CLAM OTTER SEAL TUNA SQUID".split(" "),
  },
  {
    id: "music", name: "Music", emoji: "\u{1F3B5}", color: COLORS18[8]!,
    words: "GUITAR PIANO DRUMS VIOLIN TRUMPET FLUTE BASS RHYTHM MELODY CHORD TEMPO JAZZ ROCK BLUES OPERA".split(" "),
  },
  {
    id: "movies", name: "Movies", emoji: "\u{1F3AC}", color: COLORS18[9]!,
    words: "ACTION DRAMA COMEDY HORROR ROMANCE THRILLER FANTASY MYSTERY WESTERN SEQUEL TRAILER CINEMA ACTOR SCENE".split(" "),
  },
  {
    id: "nature", name: "Nature", emoji: "\u{1F333}", color: COLORS18[10]!,
    words: "FOREST RIVER MOUNTAIN OCEAN DESERT JUNGLE VALLEY ISLAND VOLCANO GLACIER PRAIRIE CANYON MARSH TUNDRA".split(" "),
  },
  {
    id: "technology", name: "Technology", emoji: "\u{1F4BB}", color: COLORS18[11]!,
    words: "COMPUTER INTERNET ROBOT PHONE TABLET KEYBOARD MONITOR BATTERY CIRCUIT CAMERA LASER SERVER NETWORK SOFTWARE".split(" "),
  },
  {
    id: "jobs", name: "Jobs", emoji: "\u{1F4BC}", color: COLORS18[12]!,
    words: "DOCTOR TEACHER PILOT CHEF LAWYER NURSE ENGINEER ARTIST FARMER WRITER POLICE FIREFIGHTER ARCHITECT SCIENTIST".split(" "),
  },
  {
    id: "clothing", name: "Clothing", emoji: "\u{1F455}", color: COLORS18[13]!,
    words: "SHIRT PANTS DRESS JACKET SHOES SOCKS HAT SCARF GLOVES BELT BOOTS COAT SKIRT SWEATER SHORTS".split(" "),
  },
  {
    id: "vegetables", name: "Vegetables", emoji: "\u{1F955}", color: COLORS18[14]!,
    words: "CARROT POTATO TOMATO ONION GARLIC PEPPER CORN BROCCOLI SPINACH CABBAGE CELERY RADISH PUMPKIN ZUCCHINI".split(" "),
  },
];

/** Only the immediately preceding category is required, not all earlier ones. */
export function isUnlocked(index: number, completed: string[]): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= CATEGORIES.length) return false;
  return index === 0 || completed.includes(CATEGORIES[index - 1]!.id);
}
