import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { ConfigContext } from 'expo/config';
import configure from '../app.config.ts';
import { ART } from '../src/ui/artwork.ts';

const context = { config: { name: 'test', slug: 'test' } } as ConfigContext;
const fields = [
  'APP_VARIANT', 'EAS_BUILD_PROFILE', 'EAS_BUILD_PLATFORM', 'APP_NAME', 'PACKAGE_ID',
  'ADMOB_ANDROID_APP_ID', 'ADMOB_IOS_APP_ID', 'EXPO_PUBLIC_INTERSTITIAL_AD_ID', 'EXPO_PUBLIC_REWARDED_AD_ID',
];
// Format-valid fixture IDs only; these are not registered or usable ad identifiers.
const production = {
  APP_VARIANT: 'production', APP_NAME: 'Word Meadow', PACKAGE_ID: 'com.wordmeadow.mobile',
  ADMOB_ANDROID_APP_ID: 'ca-app-pub-1234567890123456~1234567890',
  EXPO_PUBLIC_INTERSTITIAL_AD_ID: 'ca-app-pub-1234567890123456/1234567891',
  EXPO_PUBLIC_REWARDED_AD_ID: 'ca-app-pub-1234567890123456/1234567892',
};

test('scaffold environment, production gate, and artwork', async (t) => {
  const original = Object.fromEntries(fields.map((key) => [key, process.env[key]]));
  const setEnv = (values: Record<string, string> = {}) => {
    for (const key of fields) delete process.env[key];
    Object.assign(process.env, values);
  };
  try {
    await t.test('development has explicit safe native defaults and no OTA', () => {
      setEnv();
      const config = configure(context);
      assert.equal(config.android?.package, 'com.example.appname');
      assert.equal(config.android?.versionCode, 1);
      assert.equal(config.version, '1.0.0');
      assert.equal(config.orientation, 'portrait');
      assert.equal(config.updates?.enabled, false);
      assert.equal(config.web?.output, 'single');
      const ads = config.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads');
      assert.ok(Array.isArray(ads));
      assert.equal(ads[1].androidAppId, 'ca-app-pub-3940256099942544~3347511713');
    });
    await t.test('native plugins write the Android AdMob app ID and disable OTA/recording', () => {
      setEnv();
      const config = JSON.parse(execFileSync(process.execPath, [
        'node_modules/expo/bin/cli', 'config', '--type', 'introspect', '--json',
      ], { encoding: 'utf8', env: { ...process.env, CI: '1' } }));
      const manifest = config._internal.modResults.android.manifest.manifest;
      type Item = { $: Record<string, string> };
      const metadata = new Map(manifest.application[0]['meta-data'].map((item: Item) => [
        item.$['android:name'], item.$['android:value'],
      ]));
      assert.equal(metadata.get('com.google.android.gms.ads.APPLICATION_ID'), 'ca-app-pub-3940256099942544~3347511713');
      assert.equal(metadata.get('expo.modules.updates.ENABLED'), 'false');
      assert.ok(manifest['uses-permission'].some((item: Item) =>
        item.$['android:name'] === 'android.permission.RECORD_AUDIO' && item.$['tools:node'] === 'remove'));
    });
    await t.test('production profile cannot use missing values or override its guard', () => {
      setEnv({ EAS_BUILD_PROFILE: 'production', APP_VARIANT: 'development' });
      assert.throws(() => configure(context), /APP_NAME, PACKAGE_ID, ADMOB_ANDROID_APP_ID, EXPO_PUBLIC_INTERSTITIAL_AD_ID, EXPO_PUBLIC_REWARDED_AD_ID/);
    });
    await t.test('each production field is mandatory and rejects development placeholders', () => {
      for (const [key, placeholder] of Object.entries({
        APP_NAME: 'App Name (Dev)', PACKAGE_ID: 'com.example.appname',
        ADMOB_ANDROID_APP_ID: 'ca-app-pub-3940256099942544~3347511713',
        EXPO_PUBLIC_INTERSTITIAL_AD_ID: 'ca-app-pub-3940256099942544/1033173712',
        EXPO_PUBLIC_REWARDED_AD_ID: 'ca-app-pub-0000000000000000/0000000000',
      })) {
        for (const value of ['', placeholder]) {
          setEnv({ ...production, [key]: value });
          assert.throws(() => configure(context), new RegExp(key));
        }
      }
    });
    await t.test('valid Android config passes; iOS additionally requires its own app ID', () => {
      setEnv(production);
      assert.equal(configure(context).android?.package, production.PACKAGE_ID);
      process.env.EAS_BUILD_PLATFORM = 'ios';
      assert.throws(() => configure(context), /ADMOB_IOS_APP_ID/);
      process.env.ADMOB_IOS_APP_ID = 'ca-app-pub-1234567890123456~1234567893';
      assert.equal(configure(context).ios?.bundleIdentifier, production.PACKAGE_ID);
    });
    await t.test('embedded artwork exactly matches all five source SVG files', () => {
      assert.deepEqual(Object.keys(ART), ['mascot', 'coin', 'trophy', 'classic-art', 'time-art']);
      for (const [key, xml] of Object.entries(ART)) {
        assert.equal(xml, readFileSync(new URL(`../assets/art/${key}.svg`, import.meta.url), 'utf8'));
      }
    });
  } finally {
    for (const key of fields) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
