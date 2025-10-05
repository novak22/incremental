import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';
import {
  ensureSlice as ensureActionSlice,
  getSliceState as getActionSliceState
} from '../src/core/state/slices/actions.js';
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
import { ensureHustleMarketState } from '../src/core/state/slices/hustleMarket.js';

const harness = await getGameTestHarness();
const { hustlesModule, assetsModule, upgradesModule } = harness;

const { ACTIONS } = hustlesModule;
const { ASSETS } = assetsModule;
const { UPGRADES } = upgradesModule;

const audienceCallDefinition = ACTIONS.find(action => action.id === 'audienceCall');
const blogDefinition = ASSETS.find(asset => asset.id === 'blog');
const assistantDefinition = UPGRADES.find(upgrade => upgrade.id === 'assistant');

function createBaseState() {
  return {
    day: 5,
    actions: {},
    hustles: {},
    assets: {},
    upgrades: {},
    progress: { knowledge: {} }
  };
}

test('action slice hydrates defaults without clobbering overrides', () => {
  const state = createBaseState();
  state.hustles[audienceCallDefinition.id] = { runsToday: 2, note: 'keep me' };

  const actions = ensureActionSlice(state);
  assert.ok(actions[audienceCallDefinition.id], 'definition entry should exist after ensure');
  const actionState = getActionSliceState(state, audienceCallDefinition.id);
  assert.equal(actionState.runsToday, 2, 'existing counters should be preserved');
  assert.equal(actionState.note, 'keep me', 'custom fields should survive normalization');
  assert.equal(
    actionState.lastRunDay,
    audienceCallDefinition.defaultState.lastRunDay,
    'default metadata should be merged in'
  );
  assert.ok(Array.isArray(actionState.instances), 'instances array should be hydrated');

  const newState = createBaseState();
  const freshHustleState = getActionSliceState(newState, audienceCallDefinition.id);
  assert.deepEqual(
    freshHustleState,
    audienceCallDefinition.defaultState,
    'new entries should clone default action state'
  );
});

test('knowledge study instances wait for enrollment before seeding', () => {
  const state = createBaseState();
  const trackId = 'outlineMastery';
  const actionId = `study-${trackId}`;
  state.progress.knowledge[trackId] = {
    daysCompleted: 0,
    studiedToday: false,
    completed: false,
    enrolled: false,
    enrolledOnDay: null
  };

  ensureActionSlice(state);
  ensureActionSlice(state);

  let studyState = getActionSliceState(state, actionId);
  assert.ok(Array.isArray(studyState.instances), 'study slice should initialize an instances array');
  assert.equal(
    studyState.instances.length,
    0,
    'inactive knowledge tracks should not seed study instances before enrollment'
  );

  const progress = state.progress.knowledge[trackId];
  progress.enrolled = true;
  progress.enrolledOnDay = state.day;

  ensureActionSlice(state);
  ensureActionSlice(state);

  studyState = getActionSliceState(state, actionId);
  assert.equal(studyState.instances.length, 1, 'activating enrollment should seed a single study instance');
  const [seededInstance] = studyState.instances;
  assert.equal(seededInstance.accepted, true, 'seeded instance should be accepted when enrollment is active');
  assert.equal(seededInstance.status, 'active', 'seeded instance should start in an active state');

  ensureActionSlice(state);
  const repeatState = getActionSliceState(state, actionId);
  assert.equal(repeatState.instances.length, 1, 'subsequent ensures should not duplicate study instances');
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

test('hustle market slice normalizes timestamps and offers', () => {
  const state = {
    hustleMarket: {
      lastRolledAt: 'invalid',
      lastRolledOnDay: -3,
      offers: [
        {
          templateId: 'freelance',
          variantId: '',
          definitionId: '',
          rolledOnDay: -2,
          rolledAt: 'nope',
          availableOnDay: -5,
          expiresOnDay: -4,
          metadata: 'bad'
        }
      ]
    }
  };

  const marketState = ensureHustleMarketState(state, { fallbackDay: 6 });

  assert.equal(marketState.lastRolledAt, 0, 'invalid timestamps should reset to zero');
  assert.equal(marketState.lastRolledOnDay, 0, 'negative roll days clamp to zero');
  assert.equal(marketState.offers.length, 1, 'single malformed offer should be preserved after normalization');

  const [offer] = marketState.offers;
  assert.equal(offer.templateId, 'freelance');
  assert.equal(offer.variantId, 'default', 'missing variant ids should default');
  assert.equal(offer.definitionId, 'freelance', 'definition id should fall back to template id');
  assert.equal(offer.rolledOnDay, 6, 'rolled day should clamp to fallback day');
  assert.equal(offer.availableOnDay, 6, 'available day should align with fallback when invalid');
  assert.equal(offer.expiresOnDay, 6, 'expiry should never precede availability');
  assert.deepEqual(offer.metadata, {}, 'non-object metadata should be replaced with an empty object');
  assert.ok(Array.isArray(offer.daysActive) && offer.daysActive.includes(6), 'daysActive should list normalized day span');
});
