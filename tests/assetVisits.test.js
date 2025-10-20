import test from 'node:test';
import assert from 'node:assert/strict';

import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { stateModule, registryModule, assetStateModule, timeModule, lifecycleModule } = harness;

const { DEFAULT_DAY_HOURS } = await import('../src/core/constants.js');
const { projectIncomeFromBase } = await import('../src/game/assets/payout.js');
const { VISIT_CONSTANTS } = await import('../src/game/assets/visits.js');
const { getInstanceQualityRange } = await import('../src/game/assets/quality/levels.js');

function setupActiveBlog() {
  harness.resetState();
  const state = stateModule.getState();
  const blogDefinition = registryModule.getAssetDefinition('blog');
  const assetState = stateModule.getAssetState('blog');
  const instance = assetStateModule.createAssetInstance(blogDefinition, { status: 'active' }, { state });
  assetState.instances = [instance];
  instance.maintenanceFundedToday = true;
  instance.quality.level = 3;
  return { blogDefinition, assetState, instance };
}

function computeProjectedDailyVisits({ definition, assetState, instance }) {
  const range = getInstanceQualityRange(definition, instance);
  const min = Number(range.min) || 0;
  const max = Number(range.max) || 0;
  const base = Math.max(0, Math.round((min + max) / 2));
  const projection = projectIncomeFromBase(definition, assetState, instance, base);
  return Math.max(0, Math.round(projection.payoutRounded)) * VISIT_CONSTANTS.VISITS_PER_DOLLAR;
}

test('blog visits accrue proportionally with time spent', () => {
  const { blogDefinition, assetState, instance } = setupActiveBlog();
  const visitsPerDay = computeProjectedDailyVisits({ definition: blogDefinition, assetState, instance });
  assert.ok(visitsPerDay > 0, 'expected visits per day to be positive for baseline instance');

  timeModule.spendTime(DEFAULT_DAY_HOURS / 2);
  const halfProgress = instance.metrics.dailyVisitProgress;
  assert.ok(halfProgress > 0, 'half-day progress should accumulate visits');
  assert.ok(Math.abs(halfProgress - visitsPerDay / 2) < 1, 'half-day visits should be close to expected midpoint');

  timeModule.spendTime(DEFAULT_DAY_HOURS / 2);
  const fullProgress = instance.metrics.dailyVisitProgress;
  assert.ok(Math.abs(fullProgress - visitsPerDay) < 1, 'full-day visits should match projection');
  assert.equal(instance.metrics.dailyViews, Math.floor(fullProgress));
});

test('endDay rolls daily visit progress into lifetime totals', () => {
  const { blogDefinition, assetState, instance } = setupActiveBlog();
  const visitsPerDay = computeProjectedDailyVisits({ definition: blogDefinition, assetState, instance });

  timeModule.spendTime(DEFAULT_DAY_HOURS / 2);
  // simulate ending the day early; remaining hours should still accumulate
  lifecycleModule.endDay(false);

  const refreshed = stateModule.getAssetState('blog');
  const metrics = refreshed.instances[0].metrics;
  assert.equal(metrics.dailyVisitProgress, 0, 'daily visit progress should reset after day close');
  assert.equal(metrics.dailyViews, 0, 'daily views should reset after day close');
  assert.equal(
    metrics.lifetimeViews,
    Math.round(visitsPerDay),
    'lifetime views should include the full day worth of visits'
  );
  assert.equal(metrics.lastViewBreakdown?.total || 0, Math.round(visitsPerDay));
});
