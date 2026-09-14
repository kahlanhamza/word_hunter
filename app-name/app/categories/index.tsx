import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { SvgXml } from 'react-native-svg';
import { CATEGORIES, isUnlocked } from '../../src/game/categories';
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

const ArrowIcon = () => (
  <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14m-6-6 6 6-6 6"/>
  </Svg>
);

const LockIcon = () => (
  <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="10" width="14" height="11" rx="3"/>
    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>
  </Svg>
);

const CoinSvg = ({ size = 24 }: { size?: number }) => (
  <SvgXml xml={ART.coin} width={size} height={size} />
);

const StarIcon = () => (
  <Svg width="38" height="38" viewBox="0 0 24 24" fill="#ffc84e" stroke="#ddaa40" strokeLinejoin="round">
    <path d="m12 2 3.1 6.4 7 1-5.1 5 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5.1-5 7-1Z"/>
  </Svg>
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

export default function CategoriesScreen() {
  const router = useRouter();
  const [completedLevels, setCompletedLevels] = useState<string[]>([]);
  const [coins, setCoins] = useState(300);
  const [unlockedCount, setUnlockedCount] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedCompleted = await AsyncStorage.getItem('completedLevels');
        if (savedCompleted) {
          setCompletedLevels(JSON.parse(savedCompleted));
        }
        const savedCoins = await AsyncStorage.getItem('coins');
        if (savedCoins) {
          setCoins(parseInt(savedCoins, 10));
        }
      } catch (e) {
        console.log('Error loading data:', e);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    let count = 1;
    for (let i = 1; i < CATEGORIES.length; i++) {
      if (isUnlocked(i, completedLevels)) {
        count = i + 1;
      } else {
        break;
      }
    }
    setUnlockedCount(count);
  }, [completedLevels]);

  const handleBack = () => {
    router.back();
  };

  const handleCategorySelect = (index: number) => {
    if (index === 0 || isUnlocked(index, completedLevels)) {
      router.push({
        pathname: '/mode',
        params: { categoryIndex: index.toString() },
      });
    }
  };

  const getProgressWidth = () => {
    return `${(unlockedCount / CATEGORIES.length) * 100}%`;
  };

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
        <Text style={styles.barTitle as TextStyle}>YOUR WORLDS</Text>
        <View style={styles.coinPill as ViewStyle}>
          <CoinSvg size={24} />
          <Text style={styles.coinText as TextStyle}>{coins}</Text>
        </View>
      </View>

      {/* Page Heading */}
      <View style={styles.pageHeading as ViewStyle}>
        <View style={styles.smallStar as ViewStyle}>
          <StarIcon />
        </View>
        <Text style={styles.bigTitle as TextStyle}>Pick your{'\n'}playground.</Text>
        <Text style={styles.subtext as TextStyle}>A little curiosity goes a long way.</Text>
      </View>

      {/* Category Progress */}
      <View style={styles.categoryProgress as ViewStyle}>
        <View style={styles.progressLabel as ViewStyle}>
          <Text style={styles.progressLabelText as TextStyle}>YOUR ADVENTURE</Text>
          <Text style={[styles.progressLabelText as any, styles.progressLabelStrong as TextStyle]}>
            {unlockedCount} / 15 WORLDS
          </Text>
        </View>
        <View style={styles.progressTrack as ViewStyle}>
          <View style={[styles.progressFill as any, { width: `${(unlockedCount / CATEGORIES.length) * 100}%` }]} />
        </View>
      </View>

      {/* Category Scroller */}
      <ScrollView
        style={styles.categoryScroller as ViewStyle}
        contentContainerStyle={styles.categoryScrollerContent as ViewStyle}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.categoryGrid as ViewStyle}>
          {CATEGORIES.map((category, index) => {
            const isUnlockedCategory = index === 0 || isUnlocked(index, completedLevels);
            const emoji = category.emoji;

            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard as any,
                  isUnlockedCategory && (styles.categoryCardUnlocked as ViewStyle),
                ]}
                onPress={() => handleCategorySelect(index)}
                disabled={!isUnlockedCategory}
              >
                <Text style={[
                  styles.worldNumber as any,
                  isUnlockedCategory && (styles.worldNumberUnlocked as TextStyle),
                ]}>
                  WORLD {String(index + 1).padStart(2, '0')}
                </Text>
                <View style={styles.categoryIcon as ViewStyle}>
                  {isUnlockedCategory ? (
                    <ArrowIcon />
                  ) : (
                    <LockIcon />
                  )}
                </View>
                <Text style={styles.categoryEmoji as TextStyle}>{emoji}</Text>
                <Text style={[
                  styles.categoryName as any,
                  isUnlockedCategory && (styles.categoryNameUnlocked as TextStyle),
                ]}>
                  {category.name}
                </Text>
                <Text style={[
                  styles.categorySmall as any,
                  isUnlockedCategory && (styles.categorySmallUnlocked as TextStyle),
                ]}>
                  {isUnlockedCategory ? (index === 0 ? "LET'S EXPLORE" : 'READY TO EXPLORE') : 'LOCKED FOR NOW'}
                </Text>
                {isUnlockedCategory && <View style={styles.categoryCardOverlay as ViewStyle} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.scrollFade as ViewStyle} />
      </ScrollView>

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
  pageHeading: {
    paddingHorizontal: 24,
    paddingTop: 19,
    position: 'relative',
  } as any,
  smallStar: {
    position: 'absolute',
    right: 31,
    top: 26,
    transform: [{ rotate: '13deg' }],
    zIndex: 1,
  } as any,
  bigTitle: {
    fontFamily: 'TitanOne-Regular',
    fontWeight: '400',
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 37,
    color: '#1a1a1a',
  } as any,
  subtext: {
    fontSize: 13,
    color: '#9c94aa',
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 10,
  } as any,
  categoryProgress: {
    marginHorizontal: 23,
    marginTop: 21,
    borderRadius: 17,
    backgroundColor: '#eae4f5',
    paddingHorizontal: 14,
    paddingVertical: 12,
  } as any,
  progressLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as any,
  progressLabelText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#8e7ca7',
  } as any,
  progressLabelStrong: {
    color: '#776291',
  } as any,
  progressTrack: {
    height: 7,
    borderRadius: 8,
    backgroundColor: '#d9cfe9',
    marginTop: 8,
    overflow: 'hidden',
  } as any,
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#a895d5',
  } as any,
  categoryScroller: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 3,
    paddingBottom: 28,
  } as any,
  categoryScrollerContent: {
    paddingTop: 0,
  } as any,
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 13,
  } as any,
  categoryCard: {
    width: (width - 44 - 26) / 2,
    height: 141,
    backgroundColor: '#ebe7ee',
    borderWidth: 1.5,
    borderColor: '#e1dce6',
    borderRadius: 24,
    shadowColor: '#dcd6e4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  categoryCardUnlocked: {
    backgroundColor: '#ffecae',
    borderColor: '#ffdb75',
    shadowColor: '#e3bc5b',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  } as any,
  categoryCardOverlay: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff1c6',
    left: 17,
    top: -23,
  } as any,
  worldNumber: {
    position: 'absolute',
    top: 10,
    left: 12,
    fontSize: 8,
    letterSpacing: 0.8,
    fontWeight: '900',
    color: '#b8aebe',
  } as any,
  worldNumberUnlocked: {
    color: '#b79849',
  } as any,
  categoryIcon: {
    position: 'absolute',
    top: 10,
    right: 12,
  } as any,
  categoryEmoji: {
    fontSize: 42,
    marginVertical: 12,
    opacity: 0.43,
    textAlign: 'center',
    color: '#a59cac',
  } as any,
  categoryName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#a59cac',
  } as any,
  categoryNameUnlocked: {
    color: '#6e4f2c',
  } as any,
  categorySmall: {
    fontSize: 8,
    color: '#b4a9bf',
    marginTop: 2,
  } as any,
  categorySmallUnlocked: {
    color: '#b59547',
  } as any,
  scrollFade: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    height: 26,
    backgroundColor: 'transparent',
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
