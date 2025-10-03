import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const {
  stateModule,
  registryModule,
  assetStateModule,
  assetsModule,
  hustlesModule,
  upgradesModule
} = harness;

const {
  ensureStateShape,
  buildDefaultState,
  initializeState,
  getState,
  getHustleState,
  getAssetState,
  getUpgradeState
} = stateModule;
const { createAssetInstance, normalizeAssetInstance, normalizeAssetState } = assetStateModule;
const { getAssetDefinition } = registryModule;
const nichesModule = await import('../src/core/state/niches.js');
const { ensureNicheStateShape } = nichesModule;

const { ASSETS } = assetsModule;
const { HUSTLES } = hustlesModule;
const { UPGRADES } = upgradesModule;

const blogDefinition = ASSETS.find(asset => asset.id === 'blog');

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('normalizeAssetInstance enforces defaults and clamps values', () => {
  const base = createAssetInstance(blogDefinition, {
    status: 'active',
    daysCompleted: 99,
    totalIncome: 123
  });
  const normalized = normalizeAssetInstance(blogDefinition, {
    id: base.id,
    status: 'setup',
    daysRemaining: -3,
    daysCompleted: -1,
    lastIncome: 'not-a-number',
    totalIncome: undefined,
    setupFundedToday: 'yes',
    maintenanceFundedToday: 'no',
    createdOnDay: -10
  });

  assert.ok(normalized.id, 'instance should retain or generate id');
  assert.equal(normalized.status, 'setup');
  assert.equal(normalized.daysRemaining, 0, 'days remaining clamps at zero');
  assert.equal(normalized.daysCompleted, 0, 'days completed clamps to zero');
  assert.equal(normalized.setupFundedToday, true);
  assert.equal(normalized.maintenanceFundedToday, true);
  assert.equal(normalized.lastIncome, 0);
  assert.equal(normalized.totalIncome, 0);
  assert.equal(normalized.createdOnDay, 1, 'created day defaults to current day');
});

test('normalizeAssetInstance respects provided state context for createdOnDay', () => {
  const contextState = { day: 9 };
  const instance = normalizeAssetInstance(
    blogDefinition,
    { status: 'active' },
    { state: contextState }
  );

  assert.equal(instance.createdOnDay, 9);
});

test('normalizeAssetState hydrates instances and respects active shortcut', () => {
  const state = normalizeAssetState(blogDefinition, {
    instances: [
      { status: 'active', daysCompleted: 0 },
      { status: 'setup', daysRemaining: 5 }
    ],
    active: true,
    fundedToday: true
  });

  assert.equal(state.instances.length, 2);
  assert.equal(state.instances[0].status, 'active');
  assert.equal(state.instances[1].status, 'setup');
});

test('normalizeAssetState seeds active instance using provided context', () => {
  const normalized = normalizeAssetState(
    blogDefinition,
    { active: true, instances: [] },
    { state: { day: 6 } }
  );

  assert.equal(normalized.instances.length, 1);
  assert.equal(normalized.instances[0].createdOnDay, 6);
});

test('ensureStateShape populates default hustle, asset, and upgrade state', () => {
  const base = buildDefaultState();
  const initialized = initializeState(base);
  ensureStateShape(initialized);

  for (const hustle of HUSTLES) {
    assert.ok(initialized.hustles[hustle.id], `hustle state missing for ${hustle.id}`);
  }
  for (const asset of ASSETS) {
    const assetState = getAssetState(asset.id, initialized);
    assert.ok(Array.isArray(assetState.instances), `asset instances missing for ${asset.id}`);
  }
  for (const upgrade of UPGRADES) {
    const upgradeState = getUpgradeState(upgrade.id, initialized);
    assert.notEqual(upgradeState, undefined, `upgrade state missing for ${upgrade.id}`);
  }
});

test('ensureStateShape preserves explicit log read flags and seeds missing ones', () => {
  const state = buildDefaultState();
  state.log = [
    { id: 'manual-unread', message: 'Keep me unread', timestamp: 1, type: 'info', read: false },
    { id: 'manual-read', message: 'Already read', timestamp: 2, type: 'warning', read: true },
    { id: 'auto-seed', message: 'Passive payout', timestamp: 3, type: 'passive:payout' }
  ];

  ensureStateShape(state);

  const [manualUnread, manualRead, autoSeeded] = state.log;
  assert.equal(manualUnread.read, false, 'explicit unread flag should be kept');
  assert.equal(manualRead.read, true, 'explicit read flag should be kept');
  assert.equal(autoSeeded.read, true, 'auto-read eligible entries without a flag should be seeded');
});

test('ensureNicheStateShape repairs popularity map and fallback day', () => {
  const state = {
    day: 4,
    niches: {
      popularity: {
        techInnovators: { score: 120, previousScore: '15' },
        fake: { score: 999, previousScore: 999 }
      },
      lastRollDay: 'oops'
    }
  };

  ensureNicheStateShape(state, { fallbackDay: state.day });

  assert.equal(state.niches.lastRollDay, 4);
  assert.ok(state.niches.popularity.techInnovators, 'known niches should be kept');
  assert.equal(state.niches.popularity.fake, undefined, 'unknown niches should be removed');
  assert.equal(state.niches.popularity.techInnovators.previousScore, 15);
  assert.ok(
    state.niches.popularity.techInnovators.score >= 0 &&
      state.niches.popularity.techInnovators.score <= 100
  );
});

test('resetState clears runtime progress and log history', () => {
  const state = getState();
  state.money = 999;
  state.log.push({ id: 'x', message: 'test', timestamp: Date.now(), type: 'info' });

  resetState();
  const fresh = getState();
  assert.equal(fresh.money, 45);
  assert.equal(fresh.log.length, 0);
});
