import { Platform } from 'react-native';
import type { AudioPlayer } from 'expo-audio';

const sources = {
  tap: require('../../assets/sounds/tap.mp3'),
  correct: require('../../assets/sounds/correct.mp3'),
  wrong: require('../../assets/sounds/wrong.mp3'),
  complete: require('../../assets/sounds/complete.mp3'),
  tick: require('../../assets/sounds/tick.mp3'),
  swipe: require('../../assets/sounds/swipe.mp3'),
  bonus: require('../../assets/sounds/bonus.mp3'),
  over: require('../../assets/sounds/over.mp3'),
} as const;

export type SoundName = keyof typeof sources;
type Player = Pick<AudioPlayer, 'pause' | 'seekTo' | 'remove'> & {
  play(): void | Promise<void>;
};
type Entry = { player: Player; busy: boolean; started: boolean };

const players = new Map<SoundName, Entry>();
let enabled = true;
let generation = 0;
let audioMode: Promise<void> | undefined;

function createPlayer(source: number): Player {
  if (Platform.OS === 'web') {
    const { Asset } = require('expo-asset') as typeof import('expo-asset');
    const media = new Audio(Asset.fromModule(source).uri);
    media.preload = 'auto';
    // expo-audio 57's web play() discards this promise, hiding autoplay rejections.
    return {
      play: () => media.play(),
      pause: () => media.pause(),
      seekTo: async (seconds) => { media.currentTime = seconds; },
      remove: () => {
        media.pause();
        media.removeAttribute('src');
        media.load();
      },
    };
  }

  // Lazy require also guards a missing native module in an outdated dev client.
  const audio = require('expo-audio') as typeof import('expo-audio');
  audioMode ??= audio.setAudioModeAsync({
    playsInSilentMode: false,
    interruptionMode: 'mixWithOthers',
    allowsRecording: false,
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  }).catch(() => {});
  return audio.createAudioPlayer(source, { downloadFirst: false, updateInterval: 1000 });
}

function release(name: SoundName, entry: Entry): void {
  if (players.get(name) !== entry) return;
  players.delete(name);
  try { entry.player.remove(); } catch { /* Audio must never interrupt the game. */ }
}

export const sound = {
  play(name: SoundName): void {
    if (!enabled || !Object.prototype.hasOwnProperty.call(sources, name)) return;
    let entry = players.get(name);
    if (!entry) {
      try {
        entry = { player: createPlayer(sources[name]), busy: false, started: false };
        players.set(name, entry);
      } catch { return; }
    }
    if (entry.busy) return;
    const current = entry;
    const token = generation;
    current.busy = true;
    void (async () => {
      try {
        // Web's first play stays synchronous within the user's gesture.
        if (Platform.OS !== 'web') await audioMode;
        if (!enabled || token !== generation) return;
        if (current.started) {
          current.player.pause();
          await current.player.seekTo(0);
        }
        if (!enabled || token !== generation) return;
        current.started = true;
        await current.player.play();
      } catch {
        release(name, current);
      } finally {
        current.busy = false;
      }
    })();
  },

  setEnabled(value: boolean): void {
    enabled = value;
    if (enabled) return;
    generation++;
    for (const [name, entry] of players) {
      try { entry.player.pause(); } catch { release(name, entry); }
    }
  },

  async dispose(): Promise<void> {
    generation++;
    for (const [name, entry] of players) release(name, entry);
  },
};
