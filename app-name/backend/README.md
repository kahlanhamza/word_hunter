# Minimal Backend

Node 22+, NestJS, no authentication, no database. The game and native ads do not depend on this server.

From this directory, install dependencies, run `npm run build`, then `npm start`.
`GET /health` returns HTTP 200 with exactly `{"status":"ok"}`.
`PORT` defaults to `3000`; `HOST` defaults to `0.0.0.0`. Port `0` is supported for tests.
`npm test` compiles decorators with TypeScript before running Node tests; `npm run test:cap` runs the pure cap suite.
When npm is not on PATH, use `node /tmp/bcode/package/bin/npm-cli.js` instead of `npm`.

## Ads Integration

Only the five allowed service files and this backend directory were added. No game/UI/main package changes.
Import from `src/services/ads` without a platform extension. Metro chooses `.native.ts` for iOS/Android and `.web.ts` for browsers; the generic file is a safe web fallback.

| API | Behavior |
| --- | --- |
| `initializeAds(): Promise<void>` | One bounded initialization attempt per JS session. Updates UMP, presents required consent, checks `canRequestAds`, then initializes the SDK and preloads. Failures leave ads disabled. Call at startup without gating offline gameplay on it. |
| `maybeShowInterstitial(): Promise<boolean>` | Call only at natural breaks. Every second accepted trigger is an opportunity, including when no ad is ready; concurrent/background/uninitialized calls do not count. Requires at least 60,000 ms since the actual interstitial `OPENED` event. Returns true only if opened. |
| `showRewardedHint(): Promise<boolean>` | Uses an already-loaded ad; returns false immediately if unavailable. Returns true only after `EARNED_REWARD`, normally on close. Grant a hint only when this resolves true. |
| `isRewardedAvailable(): boolean` | Synchronous loaded/foreground/consent/full-screen availability check. No side effects. |
| `showPrivacyOptions(): Promise<void>` | Explicit UMP privacy form when required. Drops old loaded ads and re-checks consent before requesting replacements. No-ops while another form/ad is active. |

Web returns false for both show APIs and availability; initialization and privacy are no-ops. No fake ads or rewards.

Native prerequisites remain the app owner's integration work, outside the allowed edits:

- Install compatible `react-native-google-mobile-ads` (implemented against the available 16.5.0 tarball) and `@react-native-async-storage/async-storage` into the real app.
- Configure the AdMob native app IDs / Expo config plugin and rebuild iOS/Android. Expo Go and a browser cannot run these native services.
- Configure UMP messages in AdMob; add the privacy-options UI entry point. UMP does not replace any separate iOS ATT, age-rating, child-directed, or store privacy obligations.
- Development uses Google's platform-specific `TestIds`. Release builds require `EXPO_PUBLIC_INTERSTITIAL_AD_ID` and `EXPO_PUBLIC_REWARDED_AD_ID`, set per platform build. Missing/malformed IDs or Google's sample publisher ID disable that format; production never falls back to test ads.
- AsyncStorage persists parity, actual show time, and a pre-show crash reservation. Storage failure disables interstitials for the session. Interrupted shows or corrupt storage cause a conservative cooldown; deleting app data resets local caps.
- Storage operations have 2-second limits; SDK/network/load operations have 10-second limits; consent forms and opened ads have 120-second limits. No polling or automatic error-retry loops. A load error can retry on a later explicit show call after 30 seconds; a stuck load is disabled until privacy reinitialization/restart.
- Timeout cannot dismiss native UI. Callers are released, but the ad/form lock stays held until the native terminal event arrives. Rewards arriving after a caller timed out cannot retroactively grant a hint. Reward availability is not a subscription; UI updates/polling are the caller's responsibility.

The native lifecycle tests use mocked native events. A real Android/iOS build must still verify UMP, AdMob app IDs, test-ad presentation, rewards, dismissal, and privacy changes.
