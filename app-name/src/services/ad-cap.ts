export const INTERSTITIAL_INTERVAL_MS = 60_000;

export type AdCap = Readonly<{
  version: 1;
  eligibleTriggers: 0 | 1;
  lastShownAt: number | null;
  pendingShow: boolean;
}>;

export function createAdCap(): AdCap {
  return { version: 1, eligibleTriggers: 0, lastShownAt: null, pendingShow: false };
}

export function restoreAdCap(raw: string | null, now: number): AdCap {
  if (raw === null) return createAdCap();
  try {
    const value = JSON.parse(raw);
    if (
      value?.version === 1 &&
      (value.eligibleTriggers === 0 || value.eligibleTriggers === 1) &&
      (value.lastShownAt === null ||
        (Number.isSafeInteger(value.lastShownAt) && value.lastShownAt >= 0)) &&
      typeof value.pendingShow === 'boolean'
    ) {
      return {
        version: 1,
        eligibleTriggers: value.eligibleTriggers,
        // A crash between show() and persisting OPENED must not bypass the cap.
        lastShownAt: value.pendingShow ? Math.max(now, value.lastShownAt ?? 0) : value.lastShownAt,
        pendingShow: false,
      };
    }
  } catch {
    // Corrupt/unknown storage gets a conservative cooldown, not a free show.
  }
  return { ...createAdCap(), lastShownAt: now };
}

export function recordEligibleTrigger(cap: AdCap, now: number): {
  cap: AdCap;
  shouldShow: boolean;
} {
  const eligibleTriggers = cap.eligibleTriggers === 0 ? 1 : 0;
  return {
    cap: { ...cap, eligibleTriggers },
    shouldShow:
      eligibleTriggers === 0 &&
      !cap.pendingShow &&
      Number.isSafeInteger(now) &&
      now >= 0 &&
      (cap.lastShownAt === null || now - cap.lastShownAt >= INTERSTITIAL_INTERVAL_MS),
  };
}

export function recordInterstitialShown(cap: AdCap, now: number): AdCap {
  return { ...cap, lastShownAt: now, pendingShow: false };
}
