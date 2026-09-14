import { type ViewStyle, type TextStyle, type ImageStyle, type StyleProp } from 'react-native';

// Type-safe style definitions
export interface AppStyles {
  // Container styles
  container: ViewStyle;
  
  // Status bar styles
  statusbar: ViewStyle;
  statusText: TextStyle;
  notch: ViewStyle;
  statusIcons: ViewStyle;
  
  // App bar styles
  appBar: ViewStyle;
  iconBtn: ViewStyle;
  barTitle: TextStyle;
  coinPill: ViewStyle;
  coinText: TextStyle;
  
  // Text styles
  eyebrow: TextStyle;
  bigTitle: TextStyle;
  subtext: TextStyle;
  
  // Progress styles
  categoryProgress: ViewStyle;
  progressLabel: ViewStyle;
  progressLabelText: TextStyle;
  progressLabelStrong: TextStyle;
  progressTrack: ViewStyle;
  progressFill: ViewStyle;
  
  // Category grid styles
  categoryScroller: ViewStyle;
  categoryScrollerContent: ViewStyle;
  categoryGrid: ViewStyle;
  categoryCard: ViewStyle;
  categoryCardUnlocked: ViewStyle;
  categoryCardOverlay: ViewStyle;
  worldNumber: TextStyle;
  worldNumberUnlocked: TextStyle;
  categoryIcon: ViewStyle;
  categoryEmoji: TextStyle;
  categoryName: TextStyle;
  categoryNameUnlocked: TextStyle;
  categorySmall: TextStyle;
  categorySmallUnlocked: TextStyle;
  
  // Utility styles
  scrollFade: ViewStyle;
  safeBottom: ViewStyle;
  
  // Mode screen styles
  modeHeading: ViewStyle;
  modeCards: ViewStyle;
  modeCard: ViewStyle;
  modeCardSelected: ViewStyle;
  modeCardTime: ViewStyle;
  modeCardTimeSelected: ViewStyle;
  modeArt: ViewStyle;
  modeKicker: TextStyle;
  modeTitle: TextStyle;
  modeDescription: TextStyle;
  modeTag: TextStyle;
  radio: ViewStyle;
  modeFooter: ViewStyle;
  
  // Game screen styles
  gameStats: ViewStyle;
  scoreWrap: ViewStyle;
  scoreStar: ViewStyle;
  scoreText: TextStyle;
  timerPill: ViewStyle;
  timerPillDanger: ViewStyle;
  timerText: TextStyle;
  foundMeter: ViewStyle;
  track: ViewStyle;
  foundCount: TextStyle;
  boardShell: ViewStyle;
  letterBoard: ViewStyle;
  letter: TextStyle;
  letterSelected: TextStyle;
  letterHint: ViewStyle;
  boardLines: ViewStyle;
  selectionCaption: ViewStyle;
  wordsHeading: ViewStyle;
  bonusChip: TextStyle;
  wordList: ViewStyle;
  wordChip: TextStyle;
  wordChipFound: TextStyle;
  gameTools: ViewStyle;
  hintButton: ViewStyle;
  hintButtonDisabled: ViewStyle;
  hintBadge: TextStyle;
  rewardButton: ViewStyle;
  
  // Results screen styles
  resultsHeading: ViewStyle;
  trophyScene: ViewStyle;
  resultCard: ViewStyle;
  resultScore: TextStyle;
  resultMetrics: ViewStyle;
  earnedCoins: ViewStyle;
  resultsActions: ViewStyle;
  resultsSecondary: ViewStyle;
  nextWorld: TextStyle;
  
  // Home screen specific
  homeBrand: ViewStyle;
  title: TextStyle;
  name: TextStyle;
  subtitle: TextStyle;
  heroArt: ViewStyle;
  mascotContainer: ViewStyle;
  heroSpark: TextStyle;
  heroTag: ViewStyle;
  heroTagText: TextStyle;
  homeActions: ViewStyle;
  buttonGlint: ViewStyle;
  buttonText: TextStyle;
  underButton: TextStyle;
  journeyCard: ViewStyle;
  journeyIcon: ViewStyle;
  journeyIconText: TextStyle;
  journeyContent: ViewStyle;
  journeyEyebrow: TextStyle;
  journeyTitle: TextStyle;
  journeySmall: TextStyle;
  homeBottom: ViewStyle;
  bottomItem: ViewStyle;
  bottomText: TextStyle;
  backgroundDecorator: ViewStyle;
}

// Type-safe StyleSheet helper
export function createStyles<S extends Record<string, ViewStyle | TextStyle | ImageStyle>>(styles: S): S {
  return styles;
}
