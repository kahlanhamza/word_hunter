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
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { SvgXml } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ART } from '../../src/ui/artwork';

const { width } = Dimensions.get('window');

// SVG Icons
const GridIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="2"/>
    <rect x="14" y="3" width="7" height="7" rx="2"/>
    <rect x="3" y="14" width="7" height="7" rx="2"/>
    <rect x="14" y="14" width="7" height="7" rx="2"/>
  </Svg>
);

const PlayIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="white">
    <path d="m9 5 11 7-11 7Z" />
  </Svg>
);

const ArrowIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14m-6-6 6 6-6 6"/>
  </Svg>
);

const StarIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="#ffc84e" stroke="#ddaa40" strokeLinejoin="round">
    <path d="m12 2 3.1 6.4 7 1-5.1 5 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5.1-5 7-1Z"/>
  </Svg>
);

const HelpIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M9 8a3 3 0 1 1 5 3c-2 1-2 1-2 3m0 3h.01"/>
  </Svg>
);

const SoundOnIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9h4l5-4v14l-5-4H4Z"/>
    <path d="M17 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/>
  </Svg>
);

const SoundOffIcon = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 9h4l5-4v14l-5-4H4Z"/>
    <path d="M17 8c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/>
    <path d="m17 13 5 5m0-5-5 5"/>
  </Svg>
);

const CoinSvg = ({ size = 29 }: { size?: number }) => (
  <SvgXml xml={ART.coin} width={size} height={size} />
);

const MascotSvg = ({ size = 340 }: { size?: number }) => (
  <SvgXml xml={ART.mascot} width={size} height={size * 360 / 400} />
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

const ShieldIcon = () => (
  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth={2}>
    <path d="m12 3 8 3v6c0 4-8 9-8 9S4 16 4 12V6Zm-4 8 3 3 5-5"/>
  </Svg>
);

export default function HomeScreen() {
  const router = useRouter();
  const [coins, setCoins] = useState(300);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.025,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => {
      bounce.stop();
      pulse.stop();
    };
  }, []);

  const toggleSound = async () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    try {
      await AsyncStorage.setItem('soundEnabled', newValue.toString());
    } catch (e) {
      console.log('Error saving sound preference:', e);
    }
  };

  const handlePlay = () => {
    router.push('/categories');
  };

  const handleHowTo = () => {
    router.push('/categories');
  };

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusbar}>
        <Text style={styles.statusText}>9:41</Text>
        <View style={styles.notch} />
        <View style={styles.statusIcons}>
          <SignalIcon />
          <WifiIcon />
          <BatteryIcon />
        </View>
      </View>

      {/* App Bar */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleHowTo}>
          <HelpIcon />
        </TouchableOpacity>
        <View style={styles.coinPill}>
          <CoinSvg size={24} />
          <Text style={styles.coinText}>{coins}</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={toggleSound}>
          {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
        </TouchableOpacity>
      </View>

      {/* Home Brand */}
      <View style={styles.homeBrand}>
        <Text style={styles.eyebrow}>A little word adventure</Text>
        <Text style={styles.title}>
          APP<Text style={styles.name}>_NAME</Text>
        </Text>
        <Text style={styles.subtitle}>Find your next little victory.</Text>
      </View>

      {/* Hero Art */}
      <View style={styles.heroArt}>
        <Text style={[styles.heroSpark, styles.s1]}></Text>
        <Animated.View
          style={[
            styles.mascotContainer,
            { transform: [{ translateY: bounceAnim }, { rotate: '-3deg' }] },
          ]}
        >
          <MascotSvg size={340} />
        </Animated.View>
        <Text style={[styles.heroSpark, styles.s2]}></Text>
        <View style={styles.heroTag}>
          <StarIcon />
          <Text style={styles.heroTagText}>Made for your aha!</Text>
        </View>
      </View>

      {/* Home Actions */}
      <View style={styles.homeActions}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <LinearGradient
            colors={['#ffa643', '#ff8c1a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gameButton}
          >
            <View style={styles.buttonGlint} />
            <PlayIcon />
            <Text style={styles.buttonText}>Let's play</Text>
          </LinearGradient>
        </Animated.View>
        <Text style={styles.underButton}>BIG WORDS. LITTLE HAPPY DANCES.</Text>
      </View>

      {/* Journey Card */}
      <TouchableOpacity style={styles.journeyCard} onPress={() => router.push('/categories')}>
        <View style={styles.journeyIcon}>
          <Text style={styles.journeyIconText}></Text>
        </View>
        <View style={styles.journeyContent}>
          <Text style={styles.journeyEyebrow}>Your adventure starts here</Text>
          <Text style={styles.journeyTitle}>Animals</Text>
          <Text style={styles.journeySmall}>World 01  18 hidden words</Text>
        </View>
        <ArrowIcon />
      </TouchableOpacity>

      {/* Home Bottom */}
      <View style={styles.homeBottom}>
        <View style={styles.bottomItem}>
          <GridIcon />
          <Text style={styles.bottomText}>15 worlds</Text>
        </View>
        <View style={styles.bottomItem}>
          <ShieldIcon />
          <Text style={styles.bottomText}>Offline play</Text>
        </View>
      </View>

      {/* Safe Bottom */}
      <View style={styles.safeBottom} />

      {/* Background Decoration */}
      <View style={styles.backgroundDecorator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efebf8',
    position: 'relative',
    overflow: 'hidden',
  },
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
    shadowColor: '#e7d8b4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  } as any,
  coinText: {
    fontWeight: '900',
    fontSize: 15,
    color: '#1a1a1a',
  } as any,
  homeBrand: {
    paddingTop: 12,
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  } as any,
  eyebrow: {
    fontSize: 9,
    color: '#9985b6',
    letterSpacing: 2.6,
    fontWeight: '900',
    marginBottom: 8,
  } as any,
  title: {
    fontFamily: 'TitanOne-Regular',
    fontWeight: '400',
    fontSize: 46,
    letterSpacing: -2,
    lineHeight: 52,
    color: 'white',
    textShadowColor: '#1a1a1a',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 0,
  } as any,
  name: {
    color: '#ffd75f',
  } as any,
  subtitle: {
    fontSize: 13,
    color: '#8e7da4',
    fontWeight: '800',
    marginTop: 13,
  } as any,
  heroArt: {
    height: 310,
    width: '100%',
    position: 'relative',
    marginTop: -2,
  } as any,
  mascotContainer: {
    position: 'absolute',
    left: 19,
    top: 0,
  } as any,
  heroSpark: {
    position: 'absolute',
    fontSize: 32,
    lineHeight: 32,
    color: '#ab95d0',
  } as any,
  s1: {
    top: 57,
    left: 32,
    transform: [{ rotate: '16deg' }],
  } as any,
  s2: {
    right: 25,
    top: 187,
    color: '#c4b2e0',
    fontSize: 25,
  } as any,
  heroTag: {
    position: 'absolute',
    bottom: 5,
    left: '50%',
    marginLeft: -67,
    backgroundColor: 'white',
    borderWidth: 1.5,
    borderColor: '#ded5ec',
    color: '#8a71ae',
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    transform: [{ rotate: '-4deg' }],
    shadowColor: '#dcd1eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  } as any,
  heroTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#8a71ae',
  } as any,
  homeActions: {
    paddingHorizontal: 29,
    paddingTop: 15,
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
    fontSize: 20,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -0.4,
    textShadowColor: '#dd711d',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  } as any,
  underButton: {
    fontSize: 10,
    textAlign: 'center',
    color: '#a18cac',
    letterSpacing: 1.1,
    marginTop: 17,
    fontWeight: '900',
  } as any,
  journeyCard: {
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: '#faf8ff',
    borderWidth: 1.5,
    borderColor: '#e1d9ee',
    borderRadius: 22,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    shadowColor: '#e2d8f0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  } as any,
  journeyIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: '#ffedbf',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  } as any,
  journeyIconText: {
    fontSize: 29,
  } as any,
  journeyContent: {
    flex: 1,
  } as any,
  journeyEyebrow: {
    fontSize: 8,
    color: '#a197b0',
    letterSpacing: 1.3,
    fontWeight: '900',
  } as any,
  journeyTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1a1a1a',
    marginVertical: 3,
  } as any,
  journeySmall: {
    fontSize: 10,
    color: '#ae9fbd',
  } as any,
  homeBottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 25,
    marginTop: 25,
    fontSize: 10,
    color: '#a394b4',
  } as any,
  bottomItem: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  } as any,
  bottomText: {
    fontSize: 10,
    color: '#a394b4',
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
    width: 590,
    height: 440,
    borderRadius: 250,
    backgroundColor: '#e2d9f5',
    top: 200,
    left: -104,
    zIndex: -1,
    transform: [{ rotate: '-13deg' }],
  } as any,
});
