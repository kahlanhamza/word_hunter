import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { SvgXml } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { CATEGORIES, COLORS18, isUnlocked } from '../../src/game/categories';
import { BONUS_WORDS } from '../../src/game/dictionary';
import { generatePuzzle, gridSize, lineBetween, classifySelection, type Cell, type Puzzle } from '../../src/game/engine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ART } from '../../src/ui/artwork';
import { sound } from '../../src/services/sound';
import type { ViewStyle, TextStyle } from 'react-native';

const { width } = Dimensions.get('window');

// SVG Icons
const BackIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5m6-6-6 6 6 6"/>
  </Svg>
);

const ClockIcon = () => (
  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8"/>
    <path d="M12 8v5l3 2M9 2h6m-3 0v3m6 0 2 2"/>
  </Svg>
);

const StarIcon = () => (
  <Svg width="33" height="33" viewBox="0 0 24 24" fill="#ffc84e" stroke="#ddaa40" strokeLinejoin="round">
    <path d="m12 2 3.1 6.4 7 1-5.1 5 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5.1-5 7-1Z"/>
  </Svg>
);

const SwipeIcon = () => (
  <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 12V5a2 2 0 0 1 4 0v6l5 1a3 3 0 0 1 2 4l-2 5h-7l-6-7a2 2 0 0 1 3-2l1 1M16 4h6m-2-2 2 2-2 2"/>
  </Svg>
);

const BulbIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 16c0-2-3-3-3-6.5a6.5 6.5 0 0 1 13 0c0 3.5-3 4.5-3 6.5ZM9 19h6m-5 3h4m-2-8V9m-2 1 2 2 2-2"/>
  </Svg>
);

const PlayIcon = () => (
  <Svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="m9 5 11 7-11 7Z" />
  </Svg>
);

const CoinSvg = ({ size = 24 }: { size?: number }) => (
  <SvgXml xml={ART.coin} width={size} height={size} />
);

const SignalIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth={2}>
    <path d="M3 19v-3m5 3v-7m5 7V8m5 11V4" strokeWidth={3}/>
  </Svg>
);

const WifiIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth={2}>
    <path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0m-9 4a5 5 0 0 1 6 0m-3 4h.01"/>
  </Svg>
);

const BatteryIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth={2}>
    <rect x="2" y="6" width="17" height="12" rx="3"/>
    <path d="M22 10v4M6 10v4m4-4v4m4-4v4"/>
  </Svg>
);

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryIndex: string; mode: string }>();
  const [coins, setCoins] = useState(300);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [bonusWords, setBonusWords] = useState<string[]>([]);
  const [selectedCells, setSelectedCells] = useState<Cell[]>([]);
  const [hints, setHints] = useState(3);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hintAnimations, setHintAnimations] = useState<Record<string, boolean>>({});
  const [showHint, setShowHint] = useState<Record<string, boolean>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);

  const categoryIndex = params?.categoryIndex ? parseInt(params.categoryIndex, 10) : 0;
  const mode = params?.mode as 'classic' | 'time' || 'classic';
  const category = CATEGORIES[categoryIndex] || CATEGORIES[0];

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hintAnimationRefs = useRef<Record<string, Animated.Value>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedCoins = await AsyncStorage.getItem('coins');
        if (savedCoins) {
          setCoins(parseInt(savedCoins, 10));
        }
        const savedSound = await AsyncStorage.getItem('soundEnabled');
        if (savedSound) {
          setSoundEnabled(savedSound === 'true');
        }
        const puzzleData = generatePuzzle(category.words);
        setPuzzle(puzzleData);
        if (mode === 'time') {
          setIsTimerRunning(true);
        }
      } catch (e) {
        console.log('Error loading data:', e);
      }
    };
    loadData();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isTimerRunning || mode !== 'time') return;
    timerRef.current = setTimeout(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          setGameStatus('lost');
          if (soundEnabled) sound.play('over');
          return 0;
        }
        if (prev <= 30 && soundEnabled) {
          sound.play('tick');
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimerRunning, timeLeft, mode, soundEnabled]);

  useEffect(() => {
    if (puzzle && foundWords.length === Object.keys(puzzle.placements).length) {
      setGameStatus('won');
      setIsTimerRunning(false);
      if (soundEnabled) sound.play('complete');
      const timeBonus = mode === 'time' ? timeLeft * 2 : 0;
      setScore(prev => prev + timeBonus);
      saveProgress();
    }
  }, [foundWords, puzzle, mode, timeLeft, soundEnabled]);

  const saveProgress = async () => {
    try {
      const newCoins = coins + 50;
      setCoins(newCoins);
      await AsyncStorage.setItem('coins', newCoins.toString());
      const savedCompleted = await AsyncStorage.getItem('completedLevels');
      const completed = savedCompleted ? JSON.parse(savedCompleted) : [];
      if (!completed.includes(category.id)) {
        completed.push(category.id);
        await AsyncStorage.setItem('completedLevels', JSON.stringify(completed));
      }
    } catch (e) {
      console.log('Error saving progress:', e);
    }
  };

  const handleBack = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    router.back();
  };

  const handleHint = useCallback(() => {
    if (hints <= 0 || !puzzle) return;
    const unfoundWords = Object.keys(puzzle.placements).filter(w => !foundWords.includes(w));
    if (unfoundWords.length === 0) return;
    const randomWord = unfoundWords[Math.floor(Math.random() * unfoundWords.length)];
    const cells = puzzle.placements[randomWord];
    if (cells) {
      setShowHint(prev => ({ ...prev, [randomWord]: true }));
      setHints(prev => prev - 1);
      if (soundEnabled) sound.play('tap');
      setTimeout(() => {
        setShowHint(prev => ({ ...prev, [randomWord]: false }));
      }, 1500);
    }
  }, [hints, puzzle, foundWords, soundEnabled]);

  const handleReward = useCallback(() => {
    // Show rewarded ad
    setHints(prev => prev + 1);
  }, []);

  const handleSelection = useCallback((cells: Cell[]) => {
    if (!puzzle || gameStatus !== 'playing') return;
    const result = classifySelection(puzzle, cells, foundWords, bonusWords);
    if (result.kind === 'invalid' || result.kind === 'duplicate') {
      if (soundEnabled) sound.play('wrong');
      return;
    }
    if (result.kind === 'word') {
      setFoundWords(prev => [...prev, result.word]);
      setScore(prev => prev + result.points);
      if (soundEnabled) sound.play('correct');
    } else if (result.kind === 'bonus') {
      setBonusWords(prev => [...prev, result.word]);
      setScore(prev => prev + result.points);
      if (soundEnabled) sound.play('bonus');
    }
  }, [puzzle, foundWords, bonusWords, gameStatus, soundEnabled]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      setSelectedCells([]);
    })
    .onUpdate((event) => {
      if (!puzzle) return;
      const size = puzzle.size;
      const cellSize = (width - 40) / size;
      const col = Math.floor(event.x / cellSize);
      const row = Math.floor(event.y / cellSize);
      if (row < 0 || row >= size || col < 0 || col >= size) return;
      const newCell: Cell = { row, col };
      setSelectedCells(prev => {
        if (prev.length === 0) return [newCell];
        const last = prev[prev.length - 1];
        const line = lineBetween(last, newCell);
        if (line.length > 0 && line.length <= 2) {
          return [...prev, newCell];
        }
        return prev;
      });
    })
    .onEnd(() => {
      if (selectedCells.length > 1) {
        handleSelection(selectedCells);
      }
      setSelectedCells([]);
    });

  const renderLetter = (row: number, col: number) => {
    if (!puzzle) return null;
    const letter = puzzle.grid[row][col];
    const isSelected = selectedCells.some(c => c.row === row && c.col === col);
    const isFound = foundWords.some(word => {
      const cells = puzzle.placements[word];
      return cells && cells.some(c => c.row === row && c.col === col);
    });
    const wordForHint = Object.keys(showHint).find(word => showHint[word]);
    const isHint = wordForHint && puzzle.placements[wordForHint]?.some(c => c.row === row && c.col === col);

    return (
      <View
        key={`${row}-${col}`}
        style={[
          styles.letter as any,
          isSelected && (styles.letterSelected as ViewStyle),
          isHint && (styles.letterHint as ViewStyle),
        ]}
      >
        <Text style={styles.letterText as TextStyle}>{letter}</Text>
      </View>
    );
  };

  const renderLines = () => {
    if (!puzzle) return null;
    return foundWords.map((word, index) => {
      const cells = puzzle.placements[word];
      if (!cells || cells.length === 0) return null;
      const color = COLORS18[index % COLORS18.length];
      const points = cells.map((c, i) => ({
        x: (c.col / puzzle.size) * 100,
        y: (c.row / puzzle.size) * 100,
      }));
      return (
        <Svg key={`line-${word}`} width="100%" height="100%" viewBox="0 0 100 100" style={styles.boardLines as ViewStyle}>
          <path
            d={points.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `L${p.x} ${p.y}`)).join(' ')}
            stroke={color}
            strokeOpacity={0.35}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      );
    });
  };

  const getTimerColor = () => {
    if (mode === 'classic') return '#2f80ed';
    if (timeLeft <= 30) return { backgroundColor: '#ef44444d', color: '#fca5a5' };
    return { backgroundColor: '#e3ebfc', color: '#2f80ed' };
  };

  if (gameStatus === 'won') {
    setTimeout(() => {
      router.push({
        pathname: '/results',
        params: {
          categoryIndex: categoryIndex.toString(),
          mode,
          score: score.toString(),
          foundWords: foundWords.length.toString(),
          bonusWords: bonusWords.length.toString(),
          timeLeft: timeLeft.toString(),
        },
      });
    }, 1000);
    return null;
  }

  if (gameStatus === 'lost') {
    setTimeout(() => {
      router.push({
        pathname: '/results',
        params: {
          categoryIndex: categoryIndex.toString(),
          mode,
          score: score.toString(),
          foundWords: foundWords.length.toString(),
          bonusWords: bonusWords.length.toString(),
          timeLeft: '0',
          lost: 'true',
        },
      });
    }, 1000);
    return null;
  }

  if (!puzzle) {
    return (
      <View style={[styles.container as any, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container as ViewStyle}>
      {/* Status Bar */}
      <View style={styles.statusbar as ViewStyle}>
        <Text style={styles.statusText as TextStyle}>9:41</Text>
        <View style={styles.notch as ViewStyle} />
        <View style={styles.statusIcons as ViewStyle}>
          <SignalIcon />
          <WifiIcon />
          <BatteryIcon />
        </View>
      </View>

      {/* App Bar */}
      <View style={styles.appBar as ViewStyle}>
        <TouchableOpacity style={styles.iconBtn as ViewStyle} onPress={handleBack}>
          <BackIcon />
        </TouchableOpacity>
        <View style={styles.gameTitle as ViewStyle}>
          <Text style={styles.gameTitleText as TextStyle}>{category.name}</Text>
          <Text style={styles.gameTitleSmall as TextStyle}>
            WORLD {String(categoryIndex + 1).padStart(2, '0')}  {mode === 'classic' ? 'CLASSIC' : 'TIME MODE'}
          </Text>
        </View>
        <View style={styles.coinPill as ViewStyle}>
          <CoinSvg size={24} />
          <Text style={styles.coinText as TextStyle}>{coins}</Text>
        </View>
      </View>

      {/* Game Stats */}
      <View style={styles.gameStats as ViewStyle}>
        <View style={styles.scoreWrap as ViewStyle}>
          <StarIcon />
          <View style={styles.scoreContent as ViewStyle}>
            <Text style={styles.scoreSmall as TextStyle}>SCORE</Text>
            <Text style={styles.scoreValue as TextStyle}>{score}</Text>
          </View>
        </View>
        <View style={[styles.timerPill as any, getTimerColor() as ViewStyle]}>
          <ClockIcon />
          <Text style={styles.timerText as TextStyle}>
            {mode === 'classic' ? `${Math.floor((120 - timeLeft) / 60)}:${String((120 - timeLeft) % 60).padStart(2, '0')}` : `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`}
          </Text>
        </View>
      </View>

      {/* Found Meter */}
      <View style={styles.foundMeter as ViewStyle}>
        <View style={styles.track as ViewStyle}>
          <View style={[styles.foundProgress as any, { width: `${(foundWords.length / Object.keys(puzzle.placements).length) * 100}%` }]} />
        </View>
        <Text style={styles.foundCount as TextStyle}>
          {foundWords.length} / {Object.keys(puzzle.placements).length} found
        </Text>
      </View>

      {/* Board Shell */}
      <View style={styles.boardShell as ViewStyle}>
        <View style={styles.letterBoard as ViewStyle}>
          {renderLines()}
          <View style={styles.lettersContainer as ViewStyle}>
            {Array.from({ length: puzzle.size }).map((_, row) => (
              Array.from({ length: puzzle.size }).map((_, col) => (
                renderLetter(row, col)
              ))
            ))}
          </View>
        </View>
      </View>

      {/* Selection Caption */}
      <View style={styles.selectionCaption as ViewStyle}>
        <SwipeIcon />
        <Text style={styles.selectionText as TextStyle}>
          {selectedCells.length > 0 ? selectedCells.map(c => puzzle.grid[c.row][c.col]).join('') : 'Swipe a word. Any direction.'}
        </Text>
      </View>

      {/* Words Heading */}
      <View style={styles.wordsHeading as ViewStyle}>
        <Text style={styles.eyebrow as TextStyle}>THE WORD HUNT</Text>
        <View style={styles.bonusChip as ViewStyle}>
          <Text style={styles.bonusChipText as TextStyle}> BONUS WORDS +5</Text>
        </View>
      </View>

      {/* Word List */}
      <View style={styles.wordList as ViewStyle}>
        {Object.keys(puzzle.placements).map(word => (
          <View
            key={word}
            style={[
              styles.wordChip as any,
              foundWords.includes(word) && (styles.wordChipFound as ViewStyle),
            ]}
          >
            <Text style={[
              styles.wordChipText as any,
              foundWords.includes(word) && (styles.wordChipFoundText as TextStyle),
            ]}>
              {word}
            </Text>
          </View>
        ))}
      </View>

      {/* Game Tools */}
      <View style={styles.gameTools as ViewStyle}>
        <TouchableOpacity
          style={[styles.hintButton as any, hints <= 0 && (styles.hintButtonDisabled as ViewStyle)]}
          onPress={handleHint}
          disabled={hints <= 0}
        >
          <BulbIcon />
          <Text style={styles.hintButtonText as TextStyle}>A little hint</Text>
          <View style={styles.hintBadge as ViewStyle}>
            <Text style={styles.hintBadgeText as TextStyle}>{hints}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rewardButton as ViewStyle} onPress={handleReward}>
          <PlayIcon />
          <Text style={styles.rewardButtonText as TextStyle}>Watch for +1</Text>
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.gestureArea as ViewStyle} />
      </GestureDetector>

      {/* Safe Bottom */}
      <View style={styles.safeBottom as ViewStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f2f8',
    position: 'relative',
  } as any,
  statusbar: {
    height: 39,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 5,
    position: 'relative',
    zIndex: 2,
  } as any,
  statusText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1a1a1a',
  } as any,
  notch: {
    position: 'absolute',
    width: 89,
    height: 21,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    top: 9,
    left: '50%',
    marginLeft: -44.5,
  } as any,
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  } as any,
  appBar: {
    height: 63,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    position: 'relative',
    zIndex: 3,
  } as any,
  iconBtn: {
    height: 42,
    width: 42,
    borderRadius: 15,
    backgroundColor: 'white',
    shadowColor: '#ded9e8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e7e2ed',
  } as any,
  gameTitle: {
    flex: 1,
  } as any,
  gameTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a1a',
  } as any,
  gameTitleSmall: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#a293b1',
    marginTop: 2,
  } as any,
  coinPill: {
    borderRadius: 24,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#fff9e6',
    borderWidth: 1.5,
    borderColor: '#edddb0',
    paddingHorizontal: 12,
    paddingVertical: 3,
  } as any,
  coinText: {
    fontWeight: '900',
    fontSize: 13,
    color: '#1a1a1a',
  } as any,
  gameStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 7,
  } as any,
  scoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as any,
  scoreContent: {
  } as any,
  scoreSmall: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: '#a695b2',
    fontWeight: '900',
  } as any,
  scoreValue: {
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 32,
    color: '#1a1a1a',
  } as any,
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e3ebfc',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 16,
  } as any,
  timerText: {
    fontSize: 17,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    color: '#2f80ed',
  } as any,
  foundMeter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 12,
  } as any,
  track: {
    height: 6,
    backgroundColor: '#e0d8ed',
    borderRadius: 10,
    flex: 1,
    overflow: 'hidden',
  } as any,
  foundProgress: {
    height: '100%',
    backgroundColor: '#a38bd7',
    borderRadius: 10,
  } as any,
  foundCount: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.2,
    color: '#a190b5',
  } as any,
  boardShell: {
    marginHorizontal: 20,
    padding: 11,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#e4ddeb',
    borderRadius: 25,
    shadowColor: '#dfd5ec',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    position: 'relative',
  } as any,
  letterBoard: {
    position: 'relative',
    aspectRatio: 1,
  } as any,
  boardLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  } as any,
  lettersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    zIndex: 1,
  } as any,
  letter: {
    width: `${100 / 12}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  } as any,
  letterText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#54476b',
  } as any,
  letterSelected: {
    backgroundColor: '#9d8add88',
  } as any,
  letterHint: {
    backgroundColor: '#ffda5b88',
    animation: 'hint 1.5s ease-in-out',
  } as any,
  selectionCaption: {
    height: 31,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    color: '#a294b2',
    fontSize: 9,
    letterSpacing: 0.2,
  } as any,
  selectionText: {
    fontSize: 9,
    color: '#a294b2',
    letterSpacing: 0.2,
    fontWeight: '700',
  } as any,
  wordsHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  } as any,
  eyebrow: {
    fontSize: 9,
    color: '#8b779f',
    letterSpacing: 1.1,
    fontWeight: '900',
  } as any,
  bonusChip: {
    borderRadius: 9,
    backgroundColor: '#fff0c8',
    paddingHorizontal: 7,
    paddingVertical: 4,
  } as any,
  bonusChipText: {
    fontSize: 8,
    color: '#c29128',
    fontWeight: '900',
  } as any,
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 22,
    paddingBottom: 10,
  } as any,
  wordChip: {
    height: 23,
    borderWidth: 1,
    borderColor: '#e4ddeb',
    borderRadius: 8,
    backgroundColor: 'white',
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  wordChipText: {
    fontSize: 9,
    letterSpacing: 0.3,
    color: '#94849f',
    fontWeight: '900',
  } as any,
  wordChipFound: {
    backgroundColor: '#eae5ee',
    borderColor: '#e7e0ec',
  } as any,
  wordChipFoundText: {
    color: '#c0c0c8',
    textDecorationLine: 'line-through',
  } as any,
  gameTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 23,
    paddingTop: 10,
  } as any,
  hintButton: {
    flex: 1,
    height: 46,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffedba',
    borderWidth: 1.5,
    borderColor: '#f5d788',
    shadowColor: '#e6cb88',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    position: 'relative',
  } as any,
  hintButtonDisabled: {
    opacity: 0.5,
  } as any,
  hintButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#96712b',
  } as any,
  hintBadge: {
    position: 'absolute',
    right: -5,
    top: -7,
    width: 21,
    height: 21,
    borderRadius: 10.5,
    backgroundColor: '#f86b70',
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  hintBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: 'white',
  } as any,
  rewardButton: {
    flex: 1,
    height: 46,
    borderRadius: 15,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#e3dcec',
    shadowColor: '#ddd5e8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as any,
  rewardButtonText: {
    fontSize: 11,
    color: '#9681b1',
    fontWeight: '700',
  } as any,
  gestureArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  } as any,
  safeBottom: {
    height: 5,
    width: 110,
    borderRadius: 6,
    backgroundColor: '#1a1a1a',
    opacity: 0.75,
    position: 'absolute',
    bottom: 8,
    left: '50%',
    marginLeft: -55,
    zIndex: 10,
  } as any,
});
