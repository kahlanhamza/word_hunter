import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Svg, { SvgXml } from 'react-native-svg';
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
  <Svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 4 4L19 6"/>
  </Svg>
);

const BulbIcon = () => (
  <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 16c0-2-3-3-3-6.5a6.5 6.5 0 0 1 13 0c0 3.5-3 4.5-3 6.5ZM9 19h6m-5 3h4m-2-8V9m-2 1 2 2 2-2"/>
  </Svg>
);

const CoinSvg = ({ size = 24 }: { size?: number }) => (
  <SvgXml xml={ART.coin} width={size} height={size} />
);

const ClassicArt = ({ size = 116 }: { size?: number }) => (
  <SvgXml xml={ART['classic-art']} width={size} height={size * 120 / 140} />
);

const TimeArt = ({ size = 116 }: { size?: number }) => (
  <SvgXml xml={ART['time-art']} width={size} height={size * 120 / 140} />
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

export default function ModeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryIndex: string }>();
  const [coins, setCoins] = useState(300);
  const [selectedMode, setSelectedMode] = useState<'classic' | 'time'>('classic');

  const categoryIndex = params?.categoryIndex ? parseInt(params.categoryIndex, 10) : 0;
  const category = CATEGORIES[categoryIndex] || CATEGORIES[0];

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
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleModeSelect = (mode: 'classic' | 'time') => {
    setSelectedMode(mode);
  };

  const handlePlay = () => {
    router.push({
      pathname: '/game',
      params: { categoryIndex: categoryIndex.toString(), mode: selectedMode },
    });
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
        <Text style={styles.barTitle as TextStyle}>CHOOSE YOUR VIBE</Text>
        <View style={styles.coinPill as ViewStyle}>
          <CoinSvg size={24} />
          <Text style={styles.coinText as TextStyle}>{coins}</Text>
        </View>
      </View>

      {/* Mode Heading */}
      <View style={styles.modeHeading as ViewStyle}>
        <View style={styles.pill as ViewStyle}>
          <Text style={styles.pillText as TextStyle}>
            {category.emoji} WORLD {String(categoryIndex + 1).padStart(2, '0')}  {category.name.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.bigTitle as TextStyle}>How do{'\n'}you hunt?</Text>
        <Text style={styles.subtext as TextStyle}>Same adventure. Your kind of fun.</Text>
      </View>

      {/* Mode Cards */}
      <View style={styles.modeCards as ViewStyle}>
        <TouchableOpacity
          style={[
            styles.modeCard as any,
            selectedMode === 'classic' && (styles.modeCardSelected as ViewStyle),
          ]}
          onPress={() => handleModeSelect('classic')}
        >
          <View style={[
            styles.radio as any,
            selectedMode === 'classic' && styles.radioSelected as any,
          ]}>
            {selectedMode === 'classic' && <CheckIcon />}
          </View>
          <Text style={styles.modeKicker as TextStyle}>TAKE A BREATHER</Text>
          <Text style={[styles.modeTitle as any, styles.classicTitle as TextStyle]}>Classic</Text>
          <Text style={styles.modeDescription as TextStyle}>No rush. No clock to beat.{'\n'}Just you and the words.</Text>
          <View style={styles.modeTag as ViewStyle}>
            <Text style={styles.modeTagText as TextStyle}> YOUR OWN PACE</Text>
          </View>
          <View style={styles.modeArt as ViewStyle}>
            <ClassicArt size={116} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeCard as any,
            styles.modeCardTime as any,
            selectedMode === 'time' && (styles.modeCardTimeSelected as ViewStyle),
          ]}
          onPress={() => handleModeSelect('time')}
        >
          <View style={[
            styles.radio as any,
            selectedMode === 'time' && styles.radioSelected as any,
          ]}>
            {selectedMode === 'time' && <CheckIcon />}
          </View>
          <Text style={[styles.modeKicker as any, styles.timeKicker as TextStyle]}>A LITTLE ADRENALINE</Text>
          <Text style={[styles.modeTitle as any, styles.timeTitle as TextStyle]}>Time rush</Text>
          <Text style={[styles.modeDescription as any, styles.timeDescription as TextStyle]}>
            Two minutes.{'\n'}Make every word count.
          </Text>
          <View style={[styles.modeTag as any, styles.timeTag as ViewStyle]}>
            <Text style={[styles.modeTagText as any, styles.timeTagText as TextStyle]}>
              02:00  BEAT THE CLOCK
            </Text>
          </View>
          <View style={styles.modeArt as ViewStyle}>
            <TimeArt size={116} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Mode Footer */}
      <View style={styles.modeFooter as ViewStyle}>
        <TouchableOpacity style={styles.gameButton as ViewStyle} onPress={handlePlay}>
          <View style={styles.buttonGlint as ViewStyle} />
          <Text style={styles.buttonText as TextStyle}>Let's play</Text>
        </TouchableOpacity>
        <Text style={styles.footerText as TextStyle}>
          <BulbIcon /> 3 free hints. A little nudge if you need it.
        </Text>
      </View>

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
  modeHeading: {
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
  } as any,
  pill: {
    borderRadius: 20,
    backgroundColor: '#ffedb5',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: '#f5d788',
    shadowColor: '#e6cb88',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  } as any,
  pillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
    color: '#96712b',
  } as any,
  bigTitle: {
    fontFamily: 'TitanOne-Regular',
    fontWeight: '400',
    fontSize: 36,
    letterSpacing: -0.8,
    lineHeight: 40,
    color: '#1a1a1a',
    marginVertical: 10,
  } as any,
  subtext: {
    fontSize: 13,
    color: '#a18ab9',
    fontWeight: '700',
    lineHeight: 18,
  } as any,
  modeCards: {
    paddingHorizontal: 23,
    paddingTop: 25,
    gap: 17,
  } as any,
  modeCard: {
    height: 163,
    borderRadius: 27,
    position: 'relative',
    padding: 23,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e4ddef',
    shadowColor: '#e0d8eb',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    overflow: 'hidden',
  } as any,
  modeCardSelected: {
    borderWidth: 2.5,
    borderColor: '#9b83dd',
    backgroundColor: '#eae0fc',
    shadowColor: '#bba6dc',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  } as any,
  modeCardTime: {
    backgroundColor: '#e8effa',
    borderColor: '#d6e2f5',
    shadowColor: '#d0dcf0',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  } as any,
  modeCardTimeSelected: {
    borderColor: '#73a3ee',
    backgroundColor: '#e0ebff',
    shadowColor: '#8fb5ee',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  } as any,
  modeArt: {
    position: 'absolute',
    right: 10,
    top: 35,
    width: 116,
    height: 104,
  } as any,
  radio: {
    position: 'absolute',
    right: 17,
    top: 15,
    width: 21,
    height: 21,
    borderRadius: 10.5,
    borderWidth: 2,
    borderColor: '#d5cadd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  } as any,
  radioSelected: {
    backgroundColor: '#8665c9',
    borderColor: '#8665c9',
  } as any,
  modeKicker: {
    fontSize: 8,
    letterSpacing: 1.6,
    color: '#9e8bb9',
    fontWeight: '900',
    marginBottom: 10,
  } as any,
  classicTitle: {
    color: '#654a94',
  } as any,
  timeKicker: {
    color: '#8aa2c7',
  } as any,
  timeTitle: {
    color: '#527cc4',
  } as any,
  modeTitle: {
    fontFamily: 'TitanOne-Regular',
    fontWeight: '400',
    fontSize: 25,
    letterSpacing: -0.7,
    marginBottom: 7,
  } as any,
  modeDescription: {
    fontSize: 11,
    color: '#a18ab9',
    lineHeight: 17,
  } as any,
  timeDescription: {
    color: '#8aa2c7',
  } as any,
  modeTag: {
    borderRadius: 7,
    backgroundColor: '#d9caf4',
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginTop: 9,
  } as any,
  modeTagText: {
    fontSize: 8,
    color: '#8768af',
    fontWeight: '900',
  } as any,
  timeTag: {
    backgroundColor: '#d5e3f9',
  } as any,
  timeTagText: {
    color: '#6c91cd',
  } as any,
  modeFooter: {
    paddingHorizontal: 29,
    paddingTop: 31,
  } as any,
  gameButton: {
    width: '100%',
    borderRadius: 21,
    minHeight: 61,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    position: 'relative',
    backgroundColor: '#ffa643',
    borderWidth: 2,
    borderColor: '#ffb359',
    shadowColor: '#d96b12',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
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
    fontSize: 20,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.4,
  } as any,
  footerText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#a698b5',
    marginTop: 20,
    fontWeight: '700',
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
