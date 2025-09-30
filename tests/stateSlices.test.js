import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';
import {
  ensureSlice as ensureHustleSlice,
  getSliceState as getHustleSliceState
} from '../src/core/state/slices/hustles.js';
import {
  ensureSlice as ensureAssetSlice,
  getSliceState as getAssetSliceState
} from '../src/core/state/slices/assets.js';
import {
  ensureSlice as ensureUpgradeSlice,
  getSliceState as getUpgradeSliceState
} from '../src/core/state/slices/upgrades.js';
import {
  ensureSlice as ensureProgressSlice,
  getSliceState as getProgressSliceState
} from '../src/core/state/slices/progress.js';

const harness = await getGameTestHarness();
const { hustlesModule, assetsModule, upgradesModule } = harness;

const { HUSTLES } = hustlesModule;
const { ASSETS } = assetsModule;
const { UPGRADES } = upgradesModule;

const audienceCallDefinition = HUSTLES.find(hustle => hustle.id === 'audienceCall');
const blogDefinition = ASSETS.find(asset => asset.id === 'blog');
const assistantDefinition = UPGRADES.find(upgrade => upgrade.id === 'assistant');

function createBaseState() {
  return {
    day: 5,
    hustles: {},
    assets: {},
    upgrades: {},
    progress: { knowledge: {} }
  };
}

test('hustle slice hydrates defaults without clobbering overrides', () => {
  const state = createBaseState();
  state.hustles[audienceCallDefinition.id] = { runsToday: 2, note: 'keep me' };

  const hustles = ensureHustleSlice(state);
  assert.ok(hustles[audienceCallDefinition.id], 'definition entry should exist after ensure');
  const hustleState = getHustleSliceState(state, audienceCallDefinition.id);
  assert.equal(hustleState.runsToday, 2, 'existing counters should be preserved');
  assert.equal(hustleState.note, 'keep me', 'custom fields should survive normalization');
  assert.equal(
    hustleState.lastRunDay,
    audienceCallDefinition.defaultState.lastRunDay,
    'default metadata should be merged in'
  );

  const newState = createBaseState();
  const freshHustleState = getHustleSliceState(newState, audienceCallDefinition.id);
  assert.deepEqual(
    freshHustleState,
    audienceCallDefinition.defaultState,
    'new entries should clone default hustle state'
  );
});

test('asset slice normalizes instances and respects active shortcut', () => {
  const state = createBaseState();
  state.assets.blog = {
    active: true,
    instances: [
      {
        status: 'setup',
        daysRemaining: -3,
        daysCompleted: -1,
        lastIncome: 'nope',
        createdOnDay: -10
      }
    ]
  };

  const assets = ensureAssetSlice(state);
  const blogState = getAssetSliceState(state, 'blog');
  assert.strictEqual(assets, state.assets, 'ensure should return the canonical map');
  assert.equal(blogState.instances.length, 1, 'instances should remain present after normalization');
  const instance = blogState.instances[0];
  assert.equal(instance.status, 'setup');
  assert.equal(instance.daysRemaining, 0, 'days remaining should clamp to zero');
  assert.equal(instance.createdOnDay, 1, 'invalid creation days should clamp to day one');
  assert.equal(blogState.active, undefined, 'legacy active flags should be removed');

  const fallback = getAssetSliceState(state, 'unknownAsset');
  assert.deepEqual(fallback, {}, 'unknown asset ids should resolve to empty objects');

  const freshState = createBaseState();
  const seeded = getAssetSliceState(freshState, blogDefinition.id);
  assert.deepEqual(
    seeded,
    blogDefinition.defaultState,
    'fresh asset slices should seed default state'
  );
});

test('upgrade slice sanitizes assistant progress and merges defaults', () => {
  const state = createBaseState();
  state.upgrades.assistant = { purchased: true, count: 'not-a-number' };

  const upgrades = ensureUpgradeSlice(state);
  const assistantState = getUpgradeSliceState(state, 'assistant');
  assert.strictEqual(upgrades, state.upgrades, 'ensure should preserve map references');
  assert.equal(assistantState.count, 1, 'assistant count should default to one when purchased');
  assert.equal(assistantState.purchased, undefined, 'legacy purchased flags should be cleared');

  const freshState = createBaseState();
  const seededAssistant = getUpgradeSliceState(freshState, assistantDefinition.id);
  assert.deepEqual(
    seededAssistant,
    assistantDefinition.defaultState,
    'fresh upgrade slices should clone default state'
  );
});

test('progress slice guarantees knowledge tracking structures', () => {
  const state = { progress: { knowledge: null } };
  const progress = ensureProgressSlice(state);
  assert.deepEqual(progress.knowledge, {}, 'knowledge map should always be an object');

  const knowledge = getProgressSliceState(state, 'knowledge');
  assert.strictEqual(knowledge, progress.knowledge, 'slice getter should return canonical buckets');

  const entire = getProgressSliceState(state);
  assert.strictEqual(entire, state.progress, 'omitting id should return the progress root');
});
