// Metro selects ads.native.ts on iOS/Android and ads.web.ts on web.
// Other resolvers get the truthful, native-dependency-free fallback.
export {
  initializeAds,
  maybeShowInterstitial,
  showRewardedHint,
  isRewardedAvailable,
  showPrivacyOptions,
} from './ads.web';
