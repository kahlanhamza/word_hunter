const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const serviceDir = resolve(__dirname, '../../src/services');
const source = Object.fromEntries(['ads.native', 'ads.web', 'ads', 'ad-cap'].map((name) => [name,
  ts.transpileModule(readFileSync(resolve(serviceDir, `${name}.ts`), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText,
]));
const flush = () => new Promise(setImmediate);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness(options = {}) {
  const timers = new Map();
  const store = options.store ?? new Map();
  const ads = [];
  const calls = [];
  const appState = { currentState: 'active' };
  let now = 100_000;
  let timerId = 0;
  const info = { canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' };
  class Ad {
    constructor(id) { this.id = id; this.listeners = new Set(); this.loads = 0; this.shows = 0; ads.push(this); }
    static createForAdRequest(id) { return new this(id); }
    addAdEventsListener(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    load() { this.loads++; }
    show() { this.shows++; return options.show?.(this) ?? Promise.resolve(); }
    emit(type) { for (const fn of this.listeners) fn({ type }); }
  }
  class InterstitialAd extends Ad {}
  class RewardedAd extends Ad {}
  const sdk = {
    __esModule: true,
    default: () => ({ initialize: async () => { calls.push('initialize'); return options.sdk?.(); } }),
    InterstitialAd, RewardedAd,
    TestIds: { INTERSTITIAL: 'google-test-interstitial', REWARDED: 'google-test-rewarded' },
    AdEventType: { LOADED: 'loaded', OPENED: 'opened', CLOSED: 'closed', ERROR: 'error' },
    RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'earned' },
    AdsConsentPrivacyOptionsRequirementStatus: { REQUIRED: 'REQUIRED' },
    AdsConsent: {
      requestInfoUpdate: async () => { calls.push('update'); return options.update ? options.update() : info; },
      loadAndShowConsentFormIfRequired: async () => { calls.push('consent'); return options.consent ? options.consent() : info; },
      showPrivacyOptionsForm: async () => { calls.push('privacy'); return options.privacy ? options.privacy() : info; },
    },
  };
  const cache = {};
  function load(name) {
    if (cache[name]) return cache[name];
    const module = { exports: {} };
    vm.runInNewContext(source[name], {
      module, exports: module.exports, __DEV__: options.dev ?? true, process: { env: options.env ?? {} },
      Date: class extends Date { static now() { return now; } },
      setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; },
      clearTimeout: (id) => timers.delete(id),
      require: (id) => {
        if (id === 'react-native-google-mobile-ads') return sdk;
        if (id === 'react-native') return { AppState: appState };
        if (id === '@react-native-async-storage/async-storage') return {
          getItem: async (key) => options.read ? options.read(key) : store.get(key) ?? null,
          setItem: async (key, value) => {
            if (options.write) await options.write(key, value);
            store.set(key, value);
          },
        };
        if (id.startsWith('./')) return load(id.slice(2));
        throw new Error(`Unexpected import ${id}`);
      },
    }, { filename: `${name}.js` });
    return cache[name] = module.exports;
  }
  return {
    api: load('ads.native'), web: load('ads'), ads, calls, store, appState,
    get interstitial() { return ads.findLast((ad) => ad instanceof InterstitialAd); },
    get rewarded() { return ads.findLast((ad) => ad instanceof RewardedAd); },
    setNow(value) { now = value; },
    cap() { return JSON.parse([...store.values()][0]); },
    fireTimers(ms) {
      for (const [id, timer] of [...timers]) {
        if (timer.ms === ms && timers.delete(id)) timer.fn();
      }
    },
  };
}

test('UMP completes before a single SDK initialization; development uses Google TestIds', async () => {
  const wait = deferred();
  const h = harness({ update: () => wait.promise });
  const initialization = h.api.initializeAds();
  assert.equal(h.api.initializeAds(), initialization);
  await flush();
  assert.deepEqual(h.calls, ['update']);
  assert.equal(await h.api.maybeShowInterstitial(), false);
  assert.equal(await h.api.showRewardedHint(), false);
  wait.resolve({ canRequestAds: true });
  await initialization;
  assert.deepEqual(h.calls, ['update', 'consent', 'initialize']);
  assert.equal(h.interstitial.id, 'google-test-interstitial');
  assert.equal(h.rewarded.id, 'google-test-rewarded');
  assert.equal(h.api.isRewardedAvailable(), false);
  h.rewarded.emit('rewarded_loaded');
  assert.equal(h.api.isRewardedAvailable(), true);
});

test('denied consent, network failure, and late timeout completion never initialize ads', async () => {
  for (const options of [
    { consent: async () => ({ canRequestAds: false }) },
    { update: async () => { throw new Error('offline'); } },
  ]) {
    const h = harness(options);
    await h.api.initializeAds();
    assert.equal(h.calls.includes('initialize'), false);
    assert.equal(h.api.isRewardedAvailable(), false);
  }
  const wait = deferred();
  const h = harness({ update: () => wait.promise });
  const initialized = h.api.initializeAds();
  await flush();
  h.fireTimers(10_000);
  await initialized;
  await h.api.showPrivacyOptions();
  assert.deepEqual(h.calls, ['update']);
  wait.resolve({ canRequestAds: true });
  await flush();
  assert.deepEqual(h.calls, ['update']);
});

test('production uses explicit real IDs and never falls back to Google test ads', async () => {
  for (const env of [{}, { EXPO_PUBLIC_INTERSTITIAL_AD_ID: 'bad' }, {
    EXPO_PUBLIC_REWARDED_AD_ID: 'ca-app-pub-3940256099942544/5224354917',
  }]) {
    const h = harness({ dev: false, env });
    await h.api.initializeAds();
    assert.equal(h.ads.length, 0);
  }
  const h = harness({ dev: false, env: {
    EXPO_PUBLIC_INTERSTITIAL_AD_ID: 'ca-app-pub-1111111111111111/2222222222',
    EXPO_PUBLIC_REWARDED_AD_ID: 'ca-app-pub-1111111111111111/3333333333',
  } });
  await h.api.initializeAds();
  assert.equal(h.interstitial.id, 'ca-app-pub-1111111111111111/2222222222');
  assert.equal(h.rewarded.id, 'ca-app-pub-1111111111111111/3333333333');
});

test('interstitial persists reservation before show and cooldown at actual OPENED', async () => {
  const h = harness();
  await h.api.initializeAds();
  h.interstitial.emit('loaded');
  assert.equal(await h.api.maybeShowInterstitial(), false);
  const shown = h.api.maybeShowInterstitial();
  await flush();
  assert.equal(h.interstitial.shows, 1);
  assert.equal(h.cap().pendingShow, true);
  assert.equal(h.cap().lastShownAt, null);
  assert.equal(await h.api.maybeShowInterstitial(), false);
  h.setNow(105_000);
  h.interstitial.emit('opened');
  await flush();
  assert.equal(h.cap().lastShownAt, 105_000);
  assert.equal(h.cap().pendingShow, false);
  h.interstitial.emit('closed');
  assert.equal(await shown, true);
  h.interstitial.emit('loaded');
  h.setNow(164_999);
  assert.equal(await h.api.maybeShowInterstitial(), false);
  assert.equal(await h.api.maybeShowInterstitial(), false);
  h.setNow(165_000);
  assert.equal(await h.api.maybeShowInterstitial(), false);
  const second = h.api.maybeShowInterstitial();
  await flush();
  assert.equal(h.interstitial.shows, 2);
  h.interstitial.emit('opened');
  h.interstitial.emit('closed');
  assert.equal(await second, true);
});

test('trigger parity survives service restart and failed show does not count as shown', async () => {
  const options = { show: async () => { throw new Error('show failed'); } };
  const first = harness(options);
  await first.api.initializeAds();
  assert.equal(await first.api.maybeShowInterstitial(), false);
  const second = harness({ ...options, store: first.store });
  await second.api.initializeAds();
  second.interstitial.emit('loaded');
  assert.equal(await second.api.maybeShowInterstitial(), false);
  assert.equal(second.interstitial.shows, 1);
  await flush();
  assert.equal(second.cap().lastShownAt, null);
  assert.equal(second.cap().pendingShow, false);
});

test('reward requires EARNED_REWARD, resolves once, and never stacks full-screen ads', async () => {
  const h = harness();
  await h.api.initializeAds();
  for (const terminal of ['closed', 'error']) {
    h.rewarded.emit('rewarded_loaded');
    const result = h.api.showRewardedHint();
    assert.equal(h.api.isRewardedAvailable(), false);
    assert.equal(await h.api.showRewardedHint(), false);
    h.rewarded.emit('opened');
    h.rewarded.emit(terminal);
    assert.equal(await result, false);
  }
  h.setNow(200_000);
  assert.equal(await h.api.showRewardedHint(), false);
  h.rewarded.emit('rewarded_loaded');
  const result = h.api.showRewardedHint();
  assert.equal(await h.api.maybeShowInterstitial(), false);
  let settled = false;
  void result.then(() => { settled = true; });
  h.rewarded.emit('opened');
  h.rewarded.emit('earned');
  h.rewarded.emit('earned');
  await flush();
  assert.equal(settled, false);
  h.rewarded.emit('closed');
  assert.equal(await result, true);
  h.rewarded.emit('earned');
  h.rewarded.emit('rewarded_loaded');
  const next = h.api.showRewardedHint();
  h.rewarded.emit('closed');
  assert.equal(await next, false);
});

test('show timeout releases caller but keeps the lock until a native terminal event', async () => {
  const h = harness();
  await h.api.initializeAds();
  h.rewarded.emit('rewarded_loaded');
  const result = h.api.showRewardedHint();
  h.fireTimers(10_000);
  assert.equal(await result, false);
  assert.equal(h.api.isRewardedAvailable(), false);
  const calls = h.calls.length;
  await h.api.showPrivacyOptions();
  assert.equal(h.calls.length, calls);
  h.rewarded.emit('opened');
  h.rewarded.emit('earned');
  h.rewarded.emit('closed');
  assert.equal(await result, false);
  h.rewarded.emit('rewarded_loaded');
  assert.equal(h.api.isRewardedAvailable(), true);
  const earned = h.api.showRewardedHint();
  h.rewarded.emit('opened');
  h.rewarded.emit('earned');
  h.fireTimers(120_000);
  assert.equal(await earned, true);
  assert.equal(h.api.isRewardedAvailable(), false);
  h.rewarded.emit('closed');
});

test('load errors only retry on explicit action after backoff; timeout ignores late loads', async () => {
  const h = harness();
  await h.api.initializeAds();
  h.rewarded.emit('error');
  assert.equal(h.rewarded.loads, 1);
  assert.equal(await h.api.showRewardedHint(), false);
  assert.equal(h.rewarded.loads, 1);
  h.setNow(130_000);
  assert.equal(h.rewarded.loads, 1);
  assert.equal(await h.api.showRewardedHint(), false);
  assert.equal(h.rewarded.loads, 2);
  h.fireTimers(10_000);
  h.rewarded.emit('rewarded_loaded');
  assert.equal(h.api.isRewardedAvailable(), false);
  h.setNow(200_000);
  assert.equal(await h.api.showRewardedHint(), false);
  assert.equal(h.rewarded.loads, 2);
});

test('privacy discards loaded ads and respects changed consent without reinitializing the SDK', async () => {
  const options = { privacy: async () => ({ canRequestAds: false }) };
  const h = harness(options);
  await h.api.initializeAds();
  const previous = h.rewarded;
  previous.emit('rewarded_loaded');
  assert.equal(h.api.isRewardedAvailable(), true);
  await h.api.showPrivacyOptions();
  assert.equal(h.api.isRewardedAvailable(), false);
  assert.equal(previous.listeners.size, 0);
  previous.emit('rewarded_loaded');
  assert.equal(h.api.isRewardedAvailable(), false);
  options.privacy = async () => ({ canRequestAds: true });
  await h.api.showPrivacyOptions();
  assert.notEqual(h.rewarded, previous);
  h.rewarded.emit('rewarded_loaded');
  assert.equal(h.api.isRewardedAvailable(), true);
  assert.equal(h.calls.filter((call) => call === 'initialize').length, 1);
});

test('storage read/write failure fails closed for interstitials but not rewarded ads', async () => {
  for (const options of [
    { read: async () => { throw new Error('storage unavailable'); } },
    { write: async () => { throw new Error('storage full'); } },
  ]) {
    const h = harness(options);
    await h.api.initializeAds();
    h.interstitial.emit('loaded');
    assert.equal(await h.api.maybeShowInterstitial(), false);
    assert.equal(await h.api.maybeShowInterstitial(), false);
    assert.equal(h.interstitial.shows, 0);
    h.rewarded.emit('rewarded_loaded');
    assert.equal(h.api.isRewardedAvailable(), true);
  }
});

test('storage timeout is bounded and cannot start an interstitial after the caller returns', async () => {
  const wait = deferred();
  const h = harness({ write: () => wait.promise });
  await h.api.initializeAds();
  h.interstitial.emit('loaded');
  const result = h.api.maybeShowInterstitial();
  await flush();
  h.fireTimers(2_000);
  assert.equal(await result, false);
  wait.resolve();
  await flush();
  assert.equal(await h.api.maybeShowInterstitial(), false);
  assert.equal(h.interstitial.shows, 0);
});

test('background state or a load error during persistence prevents presentation', async () => {
  for (const change of [(h) => { h.appState.currentState = 'background'; }, (h) => h.interstitial.emit('error')]) {
    const options = {};
    const h = harness(options);
    await h.api.initializeAds();
    h.interstitial.emit('loaded');
    assert.equal(await h.api.maybeShowInterstitial(), false);
    const write = deferred();
    options.write = () => write.promise;
    const result = h.api.maybeShowInterstitial();
    await flush();
    change(h);
    write.resolve();
    assert.equal(await result, false);
    assert.equal(h.interstitial.shows, 0);
    assert.equal(h.cap().pendingShow, false);
  }
});

test('web and generic fallback never import native SDK or fabricate rewards', async () => {
  const h = harness();
  assert.equal(await h.web.initializeAds(), undefined);
  assert.equal(await h.web.maybeShowInterstitial(), false);
  assert.equal(await h.web.showRewardedHint(), false);
  assert.equal(h.web.isRewardedAvailable(), false);
  assert.equal(await h.web.showPrivacyOptions(), undefined);
  assert.equal(h.calls.length, 0);
  assert.equal(h.ads.length, 0);
});
