import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const production = process.env.APP_VARIANT === 'production' || process.env.EAS_BUILD_PROFILE === 'production';
  const name = process.env.APP_NAME?.trim() || 'App Name (Dev)';
  const packageId = process.env.PACKAGE_ID?.trim() || 'com.example.appname';
  const androidAppId = process.env.ADMOB_ANDROID_APP_ID?.trim() || 'ca-app-pub-3940256099942544~3347511713';
  const iosAppId = process.env.ADMOB_IOS_APP_ID?.trim() || 'ca-app-pub-3940256099942544~1458002511';

  if (production) {
    const placeholder = /placeholder|change[ _-]?me|replace[ _-]?me|your[ _-]?(app|package|company)|[<>]/i;
    const liveAdId = (value: string | undefined, separator: '~' | '/'): boolean => {
      const id = value?.trim() || '';
      return new RegExp(`^ca-app-pub-\\d{16}${separator}\\d{10}$`).test(id) &&
        !id.startsWith('ca-app-pub-3940256099942544') &&
        !id.startsWith('ca-app-pub-0000000000000000') && !/[~/]0{10}$/.test(id);
    };
    const invalid: string[] = [];
    if (!process.env.APP_NAME?.trim() || placeholder.test(name) ||
      /^(appname(?:dev)?|example|test|todo|tbd)$/i.test(name.replace(/[^a-z0-9]/gi, ''))) invalid.push('APP_NAME');
    if (!process.env.PACKAGE_ID?.trim() || !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(packageId) ||
      /(^|\.)(example|test|appname|yourcompany)(\.|$)/i.test(packageId) || placeholder.test(packageId)) invalid.push('PACKAGE_ID');
    if (!liveAdId(process.env.ADMOB_ANDROID_APP_ID, '~')) invalid.push('ADMOB_ANDROID_APP_ID');
    // Android releases do not require an unused iOS AdMob account configuration.
    if (process.env.EAS_BUILD_PLATFORM === 'ios' && !liveAdId(process.env.ADMOB_IOS_APP_ID, '~')) invalid.push('ADMOB_IOS_APP_ID');
    if (!liveAdId(process.env.EXPO_PUBLIC_INTERSTITIAL_AD_ID, '/')) invalid.push('EXPO_PUBLIC_INTERSTITIAL_AD_ID');
    if (!liveAdId(process.env.EXPO_PUBLIC_REWARDED_AD_ID, '/')) invalid.push('EXPO_PUBLIC_REWARDED_AD_ID');
    if (invalid.length) {
      throw new Error(`Production build blocked: set real, non-placeholder values for ${invalid.join(', ')}. Google test IDs are development-only. See .env.example.`);
    }
  }

  return {
    ...config,
    name,
    slug: 'app-name',
    version: '1.0.0',
    scheme: 'appname',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    // Release bundles and local assets are shipped in the binary; no OTA startup dependency.
    updates: { enabled: false },
    android: {
      package: packageId,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#EFE6FA',
      },
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
    },
    ios: {
      bundleIdentifier: packageId,
      buildNumber: '1',
      supportsTablet: false,
    },
    web: { bundler: 'metro', output: 'single', favicon: './assets/icon.png' },
    plugins: [
      'expo-router',
      'expo-dev-client',
      'expo-asset',
      'expo-font',
      ['expo-splash-screen', { backgroundColor: '#EFE6FA' }],
      ['expo-audio', {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false,
      }],
      ['react-native-google-mobile-ads', {
        androidAppId,
        iosAppId,
        delayAppMeasurementInit: true,
      }],
    ],
    experiments: { typedRoutes: true },
  };
};
