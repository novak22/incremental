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
  upgradesModule,
  currencyModule
} = harness;

const {
  ensureStateShape,
  buildDefaultState,
  initializeState,
  getState,
  getActionState,
  getAssetState,
  getUpgradeState
} = stateModule;
const { createAssetInstance, normalizeAssetState } = assetStateModule;
const { getAssetDefinition } = registryModule;
const nichesModule = await import('../src/core/state/niches.js');
const { ensureNicheStateShape } = nichesModule;

const { ASSETS } = assetsModule;
const { ACTIONS } = hustlesModule;
const { UPGRADES } = upgradesModule;

const blogDefinition = ASSETS.find(asset => asset.id === 'blog');

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('normalizeAssetState enforces instance defaults and clamps values', () => {
  const base = createAssetInstance(blogDefinition, {
    status: 'active',
    daysCompleted: 99,
    totalIncome: 123
  });
  const normalizedState = normalizeAssetState(blogDefinition, {
    instances: [
      {
        id: base.id,
        status: 'setup',
        daysRemaining: -3,
        daysCompleted: -1,
        lastIncome: 'not-a-number',
        totalIncome: undefined,
        setupFundedToday: 'yes',
        maintenanceFundedToday: 'no',
        createdOnDay: -10,
        metrics: {
          seoScore: '75',
          backlinks: '2',
          dailyViews: -12,
          lifetimeViews: '100.4',
          lastViewBreakdown: {
            total: -50,
            entries: [
              {
                label: 'spam referrals',
                amount: -20
              }
            ]
          }
        }
      }
    ]
  });
  const normalized = normalizedState.instances[0];

  assert.ok(normalized.id, 'instance should retain or generate id');
  assert.equal(normalized.status, 'setup');
  assert.equal(normalized.daysRemaining, 0, 'days remaining clamps at zero');
  assert.equal(normalized.daysCompleted, 0, 'days completed clamps to zero');
  assert.equal(normalized.setupFundedToday, true);
  assert.equal(normalized.maintenanceFundedToday, true);
  assert.equal(normalized.lastIncome, 0);
  assert.equal(normalized.totalIncome, 0);
  assert.equal(normalized.createdOnDay, 1, 'created day defaults to current day');
  assert.equal(normalized.metrics.dailyViews, 0);
  assert.equal(normalized.metrics.lifetimeViews, 100);
  assert.equal(normalized.metrics.lastViewBreakdown, null);
});

test('normalizeAssetState respects provided state context for createdOnDay', () => {
  const contextState = { day: 9 };
  const normalizedState = normalizeAssetState(
    blogDefinition,
    { instances: [{ status: 'active' }] },
    { state: contextState }
  );
  const instance = normalizedState.instances[0];

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

test('ensureStateShape populates default action, asset, and upgrade state', () => {
  const base = buildDefaultState();
  const initialized = initializeState(base);
  ensureStateShape(initialized);

  for (const action of ACTIONS) {
    const actionState = getActionState(action.id, initialized);
    assert.ok(actionState, `action state missing for ${action.id}`);
    assert.ok(Array.isArray(actionState.instances), `action instances missing for ${action.id}`);
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

test('ensureNicheStateShape repairs popularity map and removes legacy fields', () => {
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

  assert.equal('lastRollDay' in state.niches, false);
  assert.ok(state.niches.popularity.techInnovators, 'known niches should be kept');
  assert.equal(state.niches.popularity.fake, undefined, 'unknown niches should be removed');
  assert.equal(state.niches.popularity.techInnovators.previousScore, 15);
  assert.equal(state.niches.popularity.techInnovators.score, 100);
  assert.equal(state.niches.popularity.techInnovators.delta, 85);
  assert.equal(state.niches.popularity.techInnovators.label, 'Blazing');
});

test('resetState clears runtime progress and log history', () => {
  const state = getState();
  const baselineLogCount = state.log.length;
  state.money = 999;
  state.log.push({ id: 'x', message: 'test', timestamp: Date.now(), type: 'info' });

  resetState();
  const fresh = getState();
  assert.equal(fresh.money, 45);
  assert.equal(fresh.log.length, baselineLogCount);
  const extraEntries = fresh.log.filter(entry => entry?.message === 'test');
  assert.equal(extraEntries.length, 0, 'custom log entries should be removed');
});

test('createStateManager produces isolated runtime instances', () => {
  const { createStateManager } = stateModule;
  const managerA = createStateManager();
  const managerB = createStateManager();

  const stateA = managerA.initializeState(managerA.buildDefaultState());
  const stateB = managerB.initializeState(managerB.buildDefaultState());

  stateA.money = 100;
  stateB.money = 200;

  assert.equal(managerA.getState().money, 100);
  assert.equal(managerB.getState().money, 200);

  const currencyA = currencyModule.createCurrencyModule({
    stateManager: managerA,
    addLog: () => {},
    publish: () => {},
    markDirty: () => {}
  });

  const currencyB = currencyModule.createCurrencyModule({
    stateManager: managerB,
    addLog: () => {},
    publish: () => {},
    markDirty: () => {}
  });

  currencyA.addMoney(50);
  currencyB.spendMoney(25);

  assert.equal(managerA.getState().money, 150);
  assert.equal(managerB.getState().money, 175);
  assert.notEqual(managerA.getState(), managerB.getState());
});
