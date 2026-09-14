import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import type { AdsConsentInfo } from 'react-native-google-mobile-ads';
import { createAdCap, recordEligibleTrigger, recordInterstitialShown, restoreAdCap } from './ad-cap';

const CAP_KEY = '@word-search/interstitial-cap/v1';
const STORAGE_TIMEOUT_MS = 2_000;
const REQUEST_TIMEOUT_MS = 10_000;
const FORM_TIMEOUT_MS = 120_000;
const SHOW_TIMEOUT_MS = 120_000;
const RETRY_DELAY_MS = 30_000;

type Slot = {
  ad: InterstitialAd | RewardedAd;
  rewarded: boolean;
  phase: 'idle' | 'loading' | 'ready' | 'showing' | 'disabled';
  retryAt: number;
  opened: boolean;
  earned: boolean;
  attempt: number;
  timer?: ReturnType<typeof setTimeout>;
  settle?: (result: boolean) => void;
  unsubscribe: () => void;
};

let initialization: Promise<void> | undefined;
let initializing = false;
let sdkInitialization: Promise<unknown> | undefined;
let consentOperation: Promise<AdsConsentInfo> | undefined;
let privacyBusy = false;
let enabled = false;
let interstitial: Slot | undefined;
let rewarded: Slot | undefined;
let presenting: Slot | undefined;
let triggerBusy = false;
let cap = createAdCap();
let capUsable = false;
let capWrites: Promise<void> = Promise.resolve();

async function within<T>(operation: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Ad operation timed out')), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function consentStep(action: () => Promise<AdsConsentInfo>, ms: number): Promise<AdsConsentInfo> {
  const operation = Promise.resolve().then(action);
  consentOperation = operation;
  // A timed-out native form cannot be cancelled. Keep the form lock until it actually finishes.
  void operation.then(
    () => { if (consentOperation === operation) consentOperation = undefined; },
    () => { if (consentOperation === operation) consentOperation = undefined; },
  );
  return within(operation, ms);
}

async function persistCap(): Promise<boolean> {
  if (!capUsable) return false;
  const snapshot = JSON.stringify(cap);
  capWrites = capWrites.then(async () => {
    if (capUsable) await within(AsyncStorage.setItem(CAP_KEY, snapshot), STORAGE_TIMEOUT_MS);
  }).catch(() => {
    // If durability is unavailable, disable interstitials rather than bypass the restart cap.
    capUsable = false;
  });
  await capWrites;
  return capUsable;
}

function preload(slot: Slot | undefined): void {
  if (!enabled || !slot || slot.phase !== 'idle' || Date.now() < slot.retryAt) return;
  slot.phase = 'loading';
  slot.timer = setTimeout(() => {
    // load() cannot be cancelled/reset. Ignore late loads instead of retrying a stuck instance.
    slot.phase = 'disabled';
    slot.timer = undefined;
  }, REQUEST_TIMEOUT_MS);
  try {
    slot.ad.load();
  } catch {
    clearTimeout(slot.timer);
    slot.phase = 'disabled';
  }
}

function createSlot(unitId: string, isRewarded: boolean): Slot {
  const ad = isRewarded
    ? RewardedAd.createForAdRequest(unitId)
    : InterstitialAd.createForAdRequest(unitId);
  const slot: Slot = {
    ad, rewarded: isRewarded, phase: 'idle', retryAt: 0,
    opened: false, earned: false, attempt: 0, unsubscribe: () => {},
  };
  const onEvent = ({ type }: { type: AdEventType | RewardedAdEventType }): void => {
    if (type === (isRewarded ? RewardedAdEventType.LOADED : AdEventType.LOADED)) {
      if (slot.phase !== 'loading') return;
      clearTimeout(slot.timer);
      slot.phase = 'ready';
      return;
    }
    if (slot.phase === 'showing') {
      if (type === AdEventType.OPENED && !slot.opened) {
        slot.opened = true;
        if (!isRewarded) {
          cap = recordInterstitialShown(cap, Date.now());
          void persistCap();
        }
        clearTimeout(slot.timer);
        slot.timer = setTimeout(() => slot.settle?.(isRewarded ? slot.earned : slot.opened), SHOW_TIMEOUT_MS);
      }
      if (type === RewardedAdEventType.EARNED_REWARD && isRewarded) slot.earned = true;
    }
    if (type !== AdEventType.ERROR && type !== AdEventType.CLOSED) return;
    if (slot.phase === 'disabled') return;
    clearTimeout(slot.timer);
    if (slot.phase === 'showing') {
      if (!isRewarded && !slot.opened) {
        cap = { ...cap, pendingShow: false };
        void persistCap();
      }
      slot.settle?.(isRewarded ? slot.earned : slot.opened);
      if (presenting === slot) presenting = undefined;
    }
    slot.phase = 'idle';
    slot.retryAt = type === AdEventType.ERROR ? Date.now() + RETRY_DELAY_MS : 0;
    // One preload after a real close; errors only retry on a later explicit caller action.
    if (type === AdEventType.CLOSED) preload(slot);
  };
  slot.unsubscribe = ad instanceof RewardedAd
    ? ad.addAdEventsListener(onEvent)
    : ad.addAdEventsListener(onEvent);
  return slot;
}

function present(slot: Slot): Promise<boolean> {
  const attempt = ++slot.attempt;
  presenting = slot;
  slot.phase = 'showing';
  slot.opened = false;
  slot.earned = false;
  return new Promise<boolean>((resolve) => {
    slot.settle = (result) => {
      slot.settle = undefined;
      resolve(result);
    };
    // A timeout releases the caller, NOT the full-screen lock. Only CLOSED/ERROR can do that.
    slot.timer = setTimeout(() => slot.settle?.(slot.rewarded ? slot.earned : slot.opened), REQUEST_TIMEOUT_MS);
    const failed = (): void => {
      if (slot.attempt !== attempt || slot.phase !== 'showing' || slot.opened) return;
      clearTimeout(slot.timer);
      if (!slot.rewarded) {
        cap = { ...cap, pendingShow: false };
        void persistCap();
      }
      slot.settle?.(slot.rewarded && slot.earned);
      slot.phase = 'disabled';
      if (presenting === slot) presenting = undefined;
    };
    try {
      void slot.ad.show().catch(failed);
    } catch {
      failed();
    }
  });
}

function productionId(value: string | undefined): string | undefined {
  const id = value?.trim();
  return id && /^ca-app-pub-\d{16}\/\d{10}$/.test(id) && !id.startsWith('ca-app-pub-3940256099942544/')
    ? id : undefined;
}

async function enableAfterConsent(info: AdsConsentInfo): Promise<void> {
  if (!info.canRequestAds) return;
  // Expo requires direct env property access for build-time replacement. Set IDs per platform build.
  const interstitialId = __DEV__ ? TestIds.INTERSTITIAL : productionId(process.env.EXPO_PUBLIC_INTERSTITIAL_AD_ID);
  const rewardedId = __DEV__ ? TestIds.REWARDED : productionId(process.env.EXPO_PUBLIC_REWARDED_AD_ID);
  if (!interstitialId && !rewardedId) return;
  sdkInitialization ??= mobileAds().initialize();
  await within(sdkInitialization, REQUEST_TIMEOUT_MS);
  if (interstitialId) interstitial = createSlot(interstitialId, false);
  if (rewardedId) rewarded = createSlot(rewardedId, true);
  enabled = true;
  preload(interstitial);
  preload(rewarded);
}

export function initializeAds(): Promise<void> {
  initialization ??= (async () => {
    initializing = true;
    try {
      try {
        const raw = await within(AsyncStorage.getItem(CAP_KEY), STORAGE_TIMEOUT_MS);
        cap = restoreAdCap(raw, Date.now());
        capUsable = true;
      } catch {
        capUsable = false;
      }
      await consentStep(() => AdsConsent.requestInfoUpdate(), REQUEST_TIMEOUT_MS);
      const info = await consentStep(() => AdsConsent.loadAndShowConsentFormIfRequired(), FORM_TIMEOUT_MS);
      await enableAfterConsent(info);
    } catch {
      enabled = false;
    } finally {
      initializing = false;
    }
  })();
  return initialization;
}

// Call only at natural game breaks. Each accepted call counts, even if no ad is loaded.
export async function maybeShowInterstitial(): Promise<boolean> {
  if (!enabled || !capUsable || initializing || privacyBusy || consentOperation || presenting || triggerBusy || AppState.currentState !== 'active') return false;
  triggerBusy = true;
  try {
    const decision = recordEligibleTrigger(cap, Date.now());
    cap = decision.cap;
    const slot = interstitial;
    const canShow = decision.shouldShow && slot?.phase === 'ready';
    if (canShow) cap = { ...cap, pendingShow: true };
    // Persist both trigger parity and the crash reservation before handing control to native.
    if (!await persistCap()) return false;
    if (!canShow || !slot || slot.phase !== 'ready' || AppState.currentState !== 'active') {
      if (cap.pendingShow) {
        cap = { ...cap, pendingShow: false };
        await persistCap();
      }
      preload(slot);
      return false;
    }
    return await present(slot);
  } finally {
    triggerBusy = false;
  }
}

export function isRewardedAvailable(): boolean {
  return enabled && !initializing && !privacyBusy && !consentOperation && !presenting && !triggerBusy &&
    AppState.currentState === 'active' && rewarded?.phase === 'ready';
}

export async function showRewardedHint(): Promise<boolean> {
  if (!isRewardedAvailable() || !rewarded) {
    if (!presenting && !privacyBusy && !consentOperation) preload(rewarded);
    return false;
  }
  // Never wait for a load and unexpectedly display an ad after the user has resumed playing.
  // The only code that sets earned=true handles Google's EARNED_REWARD event.
  return present(rewarded);
}

export async function showPrivacyOptions(): Promise<void> {
  await initializeAds();
  if (initializing || privacyBusy || consentOperation || presenting || triggerBusy || AppState.currentState !== 'active') return;
  privacyBusy = true;
  enabled = false;
  for (const slot of [interstitial, rewarded]) {
    if (!slot) continue;
    clearTimeout(slot.timer);
    slot.phase = 'disabled';
    slot.unsubscribe();
  }
  interstitial = undefined;
  rewarded = undefined;
  try {
    let info = await consentStep(() => AdsConsent.requestInfoUpdate(), REQUEST_TIMEOUT_MS);
    if (info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED) {
      info = await consentStep(() => AdsConsent.showPrivacyOptionsForm(), FORM_TIMEOUT_MS);
    } else {
      info = await consentStep(() => AdsConsent.loadAndShowConsentFormIfRequired(), FORM_TIMEOUT_MS);
    }
    // Discard pre-consent-change ads and re-check UMP before making any new requests.
    await enableAfterConsent(info);
  } catch {
    enabled = false;
  } finally {
    privacyBusy = false;
  }
}
