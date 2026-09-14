// No browser ad provider is configured. Never simulate an ad or a reward.
export async function initializeAds(): Promise<void> {}

export async function maybeShowInterstitial(): Promise<boolean> {
  return false;
}

export async function showRewardedHint(): Promise<boolean> {
  return false;
}

export function isRewardedAvailable(): boolean {
  return false;
}

export async function showPrivacyOptions(): Promise<void> {}
