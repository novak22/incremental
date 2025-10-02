import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { stateModule, registryModule, assetStateModule } = harness;

const { getState, getAssetState } = stateModule;
const { getAssetDefinition } = registryModule;
const { createAssetInstance } = assetStateModule;

const { buildAssetAction, calculateAssetSalePrice, sellAssetInstance } = await import('../src/game/assets/actions.js');
const { formatMaintenanceSummary, maintenanceDetail } = await import('../src/game/assets/maintenance.js');
const { rollDailyIncome, getDailyIncomeRange } = await import('../src/game/assets/payout.js');

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('asset launch actions respect resource gating and trigger setup', () => {
  const definition = getAssetDefinition('blog');
  const state = getState();
  state.money = 0;
  state.timeLeft = 0;

  const action = buildAssetAction(definition);
  assert.equal(action.disabled(), true, 'launch should be disabled without resources');

  state.money = definition.setup.cost;
  state.timeLeft = definition.setup.hoursPerDay;
  assert.equal(action.disabled(), false, 'launch should unlock when costs are covered');

  action.onClick();
  const assetState = getAssetState('blog');
  assert.equal(assetState.instances.length, 1);
  assert.equal(assetState.instances[0].setupFundedToday, true);
});

test('maintenance helpers summarize daily upkeep nicely', () => {
  const definition = {
    maintenance: { hours: 1.5, cost: 42 }
  };

  const summary = formatMaintenanceSummary(definition);
  assert.deepEqual(summary, {
    parts: ['1.5h/day', '$42/day'],
    hasUpkeep: true
  });
  assert.match(maintenanceDetail(definition), /1.5h\/day \+ \$42\/day/);
});

test('payout rolling records breakdowns and stays within expected range', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.5;

  try {
    const definition = getAssetDefinition('blog');
    const assetState = getAssetState('blog');
    const instance = createAssetInstance(definition, { status: 'active' });
    assetState.instances = [instance];

    const payout = rollDailyIncome(definition, assetState, instance);
    const range = getDailyIncomeRange(definition);

    assert.ok(payout >= range.min && payout <= range.max);
    assert.equal(instance.lastIncomeBreakdown.total, payout);
    assert.ok(Array.isArray(instance.lastIncomeBreakdown.entries));
    assert.ok(instance.lastIncomeBreakdown.entries.length >= 1);
  } finally {
    Math.random = originalRandom;
  }
});

test('selling an asset instance grants cash based on recent performance', () => {
  const definition = getAssetDefinition('blog');
  const state = getState();
  state.money = 0;
  const assetState = getAssetState('blog');
  const instance = createAssetInstance(definition, { status: 'active' });
  instance.lastIncome = 120;
  instance.quality = { level: 2 };
  assetState.instances = [instance];

  const price = calculateAssetSalePrice(instance);
  assert.equal(price, 1080, 'sale price should scale with income and quality');

  const sold = sellAssetInstance(definition, instance.id);
  assert.equal(sold, true);
  const refreshedState = getAssetState('blog');
  assert.equal(refreshedState.instances.length, 0, 'instance should be removed after sale');
  assert.equal(state.money, price, 'sale proceeds should be added to money');
});
