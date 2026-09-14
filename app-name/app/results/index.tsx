import React, { useState, useEffect, useRef } from 'react';
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
import { CATEGORIES } from '../../src/game/categories';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ART } from '../../src/ui/artwork';
import type { ViewStyle, TextStyle } from 'react-native';

const { width } = Dimensions.get('window');

// SVG Icons
const BackIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5m6-6-6 6 6 6"/>
  </Svg>
);

const CheckIcon = () => (
  <Svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 4 4L19 6"/>
  </Svg>
);

const HomeIcon = () => (
  <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 11 9-8 9 8M5 9v12h5v-7h4v7h5V9"/>
  </Svg>
);

const RepeatIcon = () => (
  <Svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 9a8 8 0 1 0 1 7M19 3v6h-6"/>
  </Svg>
);

const ArrowIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14m-6-6 6 6-6 6"/>
  </Svg>
);

const CoinSvg = ({ size = 24 }: { size?: number }) => (
  <SvgXml xml={ART.coin} width={size} height={size} />
);

const TrophySvg = ({ size = 250 }: { size?: number }) => (
  <SvgXml xml={ART.trophy} width={size} height={size * 240 / 280} />
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

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    categoryIndex: string;
    mode: string;
    score: string;
    foundWords: string;
    bonusWords: string;
    timeLeft: string;
    lost: string;
  }>();
  const [coins, setCoins] = useState(300);
  const [bounceAnim] = useState(new Animated.Value(0));

  const categoryIndex = params?.categoryIndex ? parseInt(params.categoryIndex, 10) : 0;
  const mode = params?.mode as 'classic' | 'time' || 'classic';
  const score = params?.score ? parseInt(params.score, 10) : 0;
  const foundWordsCount = params?.foundWords ? parseInt(params.foundWords, 10) : 0;
  const bonusWordsCount = params?.bonusWords ? parseInt(params.bonusWords, 10) : 0;
  const timeLeft = params?.timeLeft ? parseInt(params.timeLeft, 10) : 0;
  const lost = params?.lost === 'true';

  const category = CATEGORIES[categoryIndex] || CATEGORIES[0];
  const nextCategoryIndex = Math.min(categoryIndex + 1, CATEGORIES.length - 1);
  const nextCategory = CATEGORIES[nextCategoryIndex];

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedCoins = await AsyncStorage.getItem('coins');
        if (savedCoins) {
          setCoins(parseInt(savedCoins, 10));
        }
      } catch (e) {
        console.log('Error loading data:', e);
      }
    };
    loadData();

    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -7,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    bounce.start();

    return () => {
      bounce.stop();
    };
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleNextLevel = () => {
    router.push({
      pathname: '/mode',
      params: { categoryIndex: nextCategoryIndex.toString() },
    });
  };

  const handlePlayAgain = () => {
    router.push({
      pathname: '/game',
      params: { categoryIndex: categoryIndex.toString(), mode },
    });
  };

  const handleHome = () => {
    router.push('/home');
  };

  const displayScore = mode === 'classic' ? score : score + (timeLeft * 2);
  const timeTaken = mode === 'classic' ? `0:${String(120 - timeLeft).padStart(2, '0')}` : `${String(Math.floor((120 - timeLeft) / 60)).padStart(2, '0')}:${String((120 - timeLeft) % 60).padStart(2, '0')}`;

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
        <Text style={styles.barTitle as TextStyle}>YOU DID IT!</Text>
        <View style={styles.coinPill as ViewStyle}>
          <CoinSvg size={24} />
          <Text style={styles.coinText as TextStyle}>{coins}</Text>
        </View>
      </View>

      {/* Results Heading */}
      <View style={styles.resultsHeading as ViewStyle}>
        <Text style={styles.bigTitle as TextStyle}>Word wizard!</Text>
        <View style={styles.pill as ViewStyle}>
          <CheckIcon />
          <Text style={styles.pillText as TextStyle}>{category.name.toUpperCase()} COMPLETE</Text>
        </View>
      </View>

      {/* Trophy Scene */}
      <View style={styles.trophyScene as ViewStyle}>
        <Animated.View
          style={[
            { transform: [{ translateY: bounceAnim }] },
          ]}
        >
          <TrophySvg size={250} />
        </Animated.View>
      </View>

      {/* Result Card */}
      <View style={styles.resultCard as ViewStyle}>
        <Text style={styles.eyebrow as TextStyle}>YOUR HAPPY LITTLE HIGH SCORE</Text>
        <Text style={styles.resultScore as TextStyle}>
          {displayScore}<Text style={styles.resultScoreSmall as TextStyle}>pts</Text>
        </Text>
        <View style={styles.resultMetrics as ViewStyle}>
          <View style={styles.metric as ViewStyle}>
            <Text style={styles.metricValue as TextStyle}>{foundWordsCount}</Text>
            <Text style={styles.metricLabel as TextStyle}>words found</Text>
          </View>
          <View style={[styles.metric as any, styles.metricDivider as ViewStyle]}>
            <Text style={styles.metricValue as TextStyle}>{bonusWordsCount}</Text>
            <Text style={styles.metricLabel as TextStyle}>bonus words</Text>
          </View>
          <View style={[styles.metric as any, styles.metricDivider as ViewStyle]}>
            <Text style={styles.metricValue as TextStyle}>{timeTaken}</Text>
            <Text style={styles.metricLabel as TextStyle}>time taken</Text>
          </View>
        </View>
      </View>

      {/* Earned Coins */}
      <View style={styles.earnedCoins as ViewStyle}>
        <CoinSvg size={25} />
        <Text style={styles.earnedCoinsText as TextStyle}>+50 coins</Text>
        <Text style={styles.earnedCoinsSubtext as TextStyle}>Nicely earned!</Text>
      </View>

      {/* Results Actions */}
      <View style={styles.resultsActions as ViewStyle}>
        {nextCategoryIndex <= categoryIndex || lost ? (
          <TouchableOpacity style={styles.gameButton as ViewStyle} onPress={handlePlayAgain}>
            <View style={styles.buttonGlint as ViewStyle} />
            <Text style={styles.buttonText as TextStyle}>Play again</Text>
          </TouchableOpacity>
        ) : (
          <LinearGradient
            colors={['#ffa643', '#ff8c1a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gameButton as ViewStyle}
          >
            <View style={styles.buttonGlint as ViewStyle} />
            <Text style={styles.buttonText as TextStyle}>Next level</Text>
          </LinearGradient>
        )}

        <View style={styles.resultsSecondary as ViewStyle}>
          <TouchableOpacity style={[styles.gameButton as any, styles.secondaryButton as ViewStyle]} onPress={handlePlayAgain}>
            <RepeatIcon />
            <Text style={[styles.buttonText as any, styles.secondaryButtonText as TextStyle]}>Play again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gameButton as any, styles.secondaryButton as ViewStyle]} onPress={handleHome}>
            <HomeIcon />
            <Text style={[styles.buttonText as any, styles.secondaryButtonText as TextStyle]}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Next World */}
      {!lost && nextCategoryIndex > categoryIndex && (
        <View style={styles.nextWorld as ViewStyle}>
          <Text style={styles.nextWorldText as TextStyle}>
            A tasty new adventure awaits. <Text style={styles.nextWorldBold as TextStyle}>Next up: {nextCategory.name} {nextCategory.emoji}</Text>
          </Text>
        </View>
      )}

      {/* Safe Bottom */}
      <View style={styles.safeBottom as ViewStyle} />

      {/* Background Decoration */}
      <View style={styles.backgroundDecorator as ViewStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efeaf8',
    position: 'relative',
    overflow: 'hidden',
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
    height: 60,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  barTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
    color: '#1a1a1a',
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
    fontSize: 15,
    color: '#1a1a1a',
  } as any,
  resultsHeading: {
    textAlign: 'center',
    paddingTop: 8,
  } as any,
  bigTitle: {
    fontFamily: 'TitanOne-Regular',
    fontWeight: '400',
    fontSize: 37,
    letterSpacing: -0.8,
    lineHeight: 41,
    color: '#7c60b1',
    textShadowColor: '#7c60b1',
    textShadowOffset: { width: 0, height: 0.3 },
    textShadowRadius: 0,
    transform: [{ rotate: '-3deg' }],
  } as any,
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    backgroundColor: '#e1d7f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12,
  } as any,
  pillText: {
    fontSize: 9,
    color: '#997dbd',
    fontWeight: '900',
    letterSpacing: 0.3,
  } as any,
  trophyScene: {
    height: 204,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  resultCard: {
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#e3d8ef',
    borderRadius: 25,
    shadowColor: '#ded1eb',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    marginHorizontal: 25,
    paddingHorizontal: 17,
    paddingTop: 16,
    paddingBottom: 15,
    textAlign: 'center',
    position: 'relative',
  } as any,
  eyebrow: {
    fontSize: 8,
    color: '#b5a5c2',
    letterSpacing: 2,
    fontWeight: '900',
  } as any,
  resultScore: {
    fontFamily: 'TitanOne-Regular',
    fontWeight: '400',
    fontSize: 51,
    lineHeight: 59,
    color: '#6d519d',
    letterSpacing: -1,
    marginVertical: 4,
  } as any,
  resultScoreSmall: {
    fontFamily: 'Nunito',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0,
    color: '#b29bc4',
    marginLeft: 3,
  } as any,
  resultMetrics: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5ddee',
    paddingTop: 11,
    marginTop: 8,
  } as any,
  metric: {
    flex: 1,
    alignItems: 'center',
  } as any,
  metricDivider: {
    borderLeftWidth: 1,
    borderLeftColor: '#eee6f5',
  } as any,
  metricValue: {
    fontSize: 16,
    color: '#8c75a2',
    fontWeight: '900',
  } as any,
  metricLabel: {
    fontSize: 8,
    color: '#b6a8bf',
    marginTop: 2,
  } as any,
  earnedCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff0c5',
    borderWidth: 1.5,
    borderColor: '#f5d77f',
    borderRadius: 15,
    marginHorizontal: 25,
    marginTop: 14,
    height: 42,
  } as any,
  earnedCoinsText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#b58b31',
  } as any,
  earnedCoinsSubtext: {
    fontSize: 9,
    color: '#c2a565',
    marginLeft: 8,
  } as any,
  resultsActions: {
    paddingHorizontal: 28,
    paddingTop: 22,
  } as any,
  gameButton: {
    width: '100%',
    borderRadius: 21,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    position: 'relative',
    shadowColor: '#d96b12',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#ffb359',
  } as any,
  buttonGlint: {
    position: 'absolute',
    width: 30,
    height: 5,
    borderRadius: 9,
    backgroundColor: '#ffffff88',
    top: 6,
    left: 17,
    transform: [{ rotate: '-3deg' }],
  } as any,
  buttonText: {
    fontSize: 17,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.4,
  } as any,
  resultsSecondary: {
    flexDirection: 'row',
    gap: 11,
    marginTop: 16,
  } as any,
  secondaryButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 15,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#e5deed',
    shadowColor: '#dfd7eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  } as any,
  secondaryButtonText: {
    fontSize: 12,
    color: '#1a1a1a',
    fontWeight: '900',
  } as any,
  nextWorld: {
    textAlign: 'center',
    marginTop: 17,
  } as any,
  nextWorldText: {
    fontSize: 9,
    color: '#ae9bbd',
  } as any,
  nextWorldBold: {
    color: '#9a80ad',
    fontWeight: '900',
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
  backgroundDecorator: {
    position: 'absolute',
    inset: 97,
    left: -150,
    right: -150,
    height: 340,
    backgroundColor: 'transparent',
    borderRadius: 170,
    zIndex: -1,
    overflow: 'hidden',
  } as any,
});
