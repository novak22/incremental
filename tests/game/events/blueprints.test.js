import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSET_EVENT_BLUEPRINTS, NICHE_EVENT_BLUEPRINTS } from '../../../src/game/events/config.js';

function withMockedRandom(sequence, callback) {
  const original = Math.random;
  let index = 0;
  Math.random = () => {
    const nextIndex = index++;
    if (nextIndex >= sequence.length) return sequence[sequence.length - 1] ?? 0;
    return sequence[nextIndex];
  };
  try {
    return callback();
  } finally {
    Math.random = original;
  }
}

const expectedAssetBlueprintIds = [
  'asset:viralTrend',
  'asset:platformSetback',
  'asset:blogQualityCelebration',
  'asset:vlogQualityCelebration',
  'asset:dropshippingQualityCelebration',
  'asset:saasQualityCelebration',
  'asset:ebookQualityCelebration',
  'asset:stockPhotosQualityCelebration'
];

const expectedNicheBlueprintIds = ['niche:trendWave', 'niche:trendDip'];

test('asset event blueprints retain expected ordering', () => {
  const ids = ASSET_EVENT_BLUEPRINTS.map(blueprint => blueprint.id);
  assert.deepEqual(ids, expectedAssetBlueprintIds);
});

test('niche event blueprints retain expected ordering', () => {
  const ids = NICHE_EVENT_BLUEPRINTS.map(blueprint => blueprint.id);
  assert.deepEqual(ids, expectedNicheBlueprintIds);
});

test('niche trend wave ramps toward a stronger boost across its duration', () => {
  const blueprint = NICHE_EVENT_BLUEPRINTS.find(entry => entry.id === 'niche:trendWave');
  assert.ok(blueprint, 'trend wave blueprint is registered');

  withMockedRandom([0.4, 0.25, 0.6], () => {
    const context = {};
    const duration = blueprint.duration(context);
    const initial = blueprint.initialPercent(context);
    const daily = blueprint.dailyPercentChange(context);

    assert.equal(duration, 7);
    assert.ok(duration >= 5 && duration <= 10);
    assert.ok(initial >= 0.08 && initial <= 0.16);
    assert.ok(daily > 0, 'positive trends gain steam each day');

    const final = initial + daily * (duration - 1);
    assert.ok(final > initial);
    assert.ok(final >= 0.3 && final <= 0.6);
  });
});

test('niche trend dip deepens before recovering', () => {
  const blueprint = NICHE_EVENT_BLUEPRINTS.find(entry => entry.id === 'niche:trendDip');
  assert.ok(blueprint, 'trend dip blueprint is registered');

  withMockedRandom([0.8, 0.1, 0.3], () => {
    const context = {};
    const duration = blueprint.duration(context);
    const initial = blueprint.initialPercent(context);
    const daily = blueprint.dailyPercentChange(context);

    assert.equal(duration, 9);
    assert.ok(duration >= 5 && duration <= 10);
    assert.ok(initial <= -0.12 && initial >= -0.18);
    assert.ok(daily < 0, 'negative trends slide downward each day');

    const final = initial + daily * (duration - 1);
    assert.ok(final < initial);
    assert.ok(final <= -0.32 && final >= -0.7);
  });
});

test('niche trend durations roll between five and ten days', () => {
  const wave = NICHE_EVENT_BLUEPRINTS.find(entry => entry.id === 'niche:trendWave');
  const dip = NICHE_EVENT_BLUEPRINTS.find(entry => entry.id === 'niche:trendDip');
  assert.ok(wave && dip, 'trend blueprints should exist');

  withMockedRandom([0, 0, 0], () => {
    const context = {};
    const minDuration = wave.duration(context);
    assert.equal(minDuration, 5);
  });

  withMockedRandom([0.999, 0.999, 0.999], () => {
    const context = {};
    const maxDuration = dip.duration(context);
    assert.equal(maxDuration, 10);
  });
});
