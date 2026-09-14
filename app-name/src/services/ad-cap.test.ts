import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createAdCap,
  INTERSTITIAL_INTERVAL_MS,
  recordEligibleTrigger,
  recordInterstitialShown,
  restoreAdCap,
} from './ad-cap.ts';

test('only every second eligible trigger is a show opportunity', () => {
  let cap = createAdCap();
  for (let trigger = 1; trigger <= 10; trigger++) {
    const result = recordEligibleTrigger(cap, 100_000);
    assert.equal(result.shouldShow, trigger % 2 === 0);
    cap = result.cap;
  }
});

test('exactly 60000ms must pass from actual OPENED, not the trigger', () => {
  const opportunity = recordEligibleTrigger(recordEligibleTrigger(createAdCap(), 1_000).cap, 2_000);
  assert.equal(opportunity.shouldShow, true);
  const shown = recordInterstitialShown(opportunity.cap, 10_000);
  const first = recordEligibleTrigger(shown, 69_998);
  const tooSoon = recordEligibleTrigger(first.cap, 69_999);
  assert.equal(tooSoon.shouldShow, false);
  const odd = recordEligibleTrigger(tooSoon.cap, 70_000);
  assert.equal(odd.shouldShow, false);
  assert.equal(recordEligibleTrigger(odd.cap, 70_000).shouldShow, true);
  assert.equal(INTERSTITIAL_INTERVAL_MS, 60_000);
});

test('unloaded or failed shows never update lastShownAt', () => {
  const original = createAdCap();
  const first = recordEligibleTrigger(original, 1_000);
  const missed = recordEligibleTrigger(first.cap, 2_000);
  assert.equal(missed.cap.lastShownAt, null);
  assert.equal(recordEligibleTrigger(missed.cap, 3_000).shouldShow, false);
  assert.deepEqual(original, createAdCap());
});

test('parity and actual show time survive serialization and restart', () => {
  const cap = recordEligibleTrigger(recordInterstitialShown(createAdCap(), 100_000), 110_000).cap;
  const restored = restoreAdCap(JSON.stringify(cap), 120_000);
  assert.deepEqual(restored, cap);
  assert.equal(recordEligibleTrigger(restored, 159_999).shouldShow, false);
  assert.equal(recordEligibleTrigger(restored, 160_000).shouldShow, true);
});

test('clock rollback cannot bypass the cooldown', () => {
  const cap = { ...createAdCap(), eligibleTriggers: 1 as const, lastShownAt: 200_000 };
  assert.equal(recordEligibleTrigger(cap, 100_000).shouldShow, false);
  assert.equal(restoreAdCap(JSON.stringify(cap), 100_000).lastShownAt, 200_000);
});

test('an interrupted show reserves a conservative cooldown on restart', () => {
  const pending = { ...createAdCap(), eligibleTriggers: 1 as const, pendingShow: true };
  assert.equal(recordEligibleTrigger(pending, 500_000).shouldShow, false);
  const restored = restoreAdCap(JSON.stringify(pending), 500_000);
  assert.equal(restored.pendingShow, false);
  assert.equal(restored.lastShownAt, 500_000);
  assert.equal(recordEligibleTrigger(restored, 559_999).shouldShow, false);
  assert.equal(recordEligibleTrigger(restored, 560_000).shouldShow, true);
});

test('missing storage starts fresh, but invalid storage fails conservatively', () => {
  assert.deepEqual(restoreAdCap(null, 1_000), createAdCap());
  for (const raw of ['{', 'null', '[]', '{}', '{"version":2}', JSON.stringify({
    ...createAdCap(), lastShownAt: -1,
  }), JSON.stringify({ ...createAdCap(), eligibleTriggers: 2 })]) {
    assert.deepEqual(restoreAdCap(raw, 1_000), { ...createAdCap(), lastShownAt: 1_000 });
  }
});

test('invalid clocks cannot authorize an interstitial', () => {
  const cap = { ...createAdCap(), eligibleTriggers: 1 as const };
  for (const now of [NaN, Infinity, -1, 1.5]) {
    assert.equal(recordEligibleTrigger(cap, now).shouldShow, false);
  }
});
