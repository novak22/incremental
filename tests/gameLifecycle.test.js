import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from './helpers/setupDom.js';

ensureTestDom();

const stateModule = await import('../src/core/state.js');
const registryModule = await import('../src/core/state/registry.js');
const assetStateModule = await import('../src/core/state/assets.js');
const assetsModule = await import('../src/game/assets/index.js');
const hustlesModule = await import('../src/game/hustles.js');
const upgradesModule = await import('../src/game/upgrades.js');
const requirementsModule = await import('../src/game/requirements.js');

const { buildDefaultState, initializeState, getState, getAssetState, getUpgradeState } = stateModule;
const { configureRegistry, getAssetDefinition } = registryModule;
const { createAssetInstance } = assetStateModule;
const { allocateAssetMaintenance, closeOutDay, ASSETS, getIncomeRangeForDisplay } = assetsModule;
const { HUSTLES } = hustlesModule;
const { UPGRADES } = upgradesModule;
const {
  KNOWLEDGE_TRACKS,
  advanceKnowledgeTracks,
  allocateDailyStudy,
  enrollInKnowledgeTrack,
  getKnowledgeProgress
} = requirementsModule;
const registryService = await import('../src/game/registryService.js');

registryService.resetRegistry();
registryService.loadRegistry({ assets: ASSETS, hustles: HUSTLES, upgrades: UPGRADES });
configureRegistry();

const resetState = () => initializeState(buildDefaultState());

let state;

test.beforeEach(() => {
  state = resetState();
});

test('funded setup days promote asset instances to active status', () => {
  const blogDefinition = getAssetDefinition('blog');
  const blogState = getAssetState('blog');
  blogState.instances = [createAssetInstance(blogDefinition, {
    status: 'setup',
    daysRemaining: 1,
    daysCompleted: blogDefinition.setup.days - 1,
    setupFundedToday: false
  })];
  state.timeLeft = 10;

  allocateAssetMaintenance();

  let updatedInstance = getAssetState('blog').instances[0];
  assert.equal(updatedInstance.setupFundedToday, true, 'setup hours should be allocated when time is available');
  assert.equal(state.timeLeft, 7, 'setup hours should deduct from daily time');

  closeOutDay();

  updatedInstance = getAssetState('blog').instances[0];
  assert.equal(updatedInstance.status, 'active', 'instance should become active after required setup days funded');
  assert.equal(updatedInstance.daysCompleted, blogDefinition.setup.days, 'completed days should match setup requirement');
  assert.equal(updatedInstance.daysRemaining, 0, 'no setup time should remain');
});

test('maintenance funding yields end-of-day payouts', () => {
  const originalRandom = Math.random;
  Math.random = () => 0; // force minimum roll for deterministic assertion

  try {
    const blogDefinition = getAssetDefinition('blog');
    const blogState = getAssetState('blog');
    blogState.instances = [createAssetInstance(blogDefinition, {
      status: 'active',
      daysRemaining: 0,
      daysCompleted: blogDefinition.setup.days,
      maintenanceFundedToday: false
    })];
    const instanceId = blogState.instances[0].id;
    state.timeLeft = 10;
    state.money = 10;

    allocateAssetMaintenance();

    let updatedInstance = getAssetState('blog').instances.find(item => item.id === instanceId);
    assert.equal(updatedInstance.maintenanceFundedToday, true, 'maintenance should be funded when hours remain');
    assert.equal(state.timeLeft, 9.4, 'maintenance should consume daily hours');
    assert.equal(state.money, 7, 'maintenance should deduct upkeep cash');

    closeOutDay();

    const expectedMinimumIncome = getIncomeRangeForDisplay('blog').min;
    updatedInstance = getAssetState('blog').instances.find(item => item.id === instanceId);
    assert.equal(updatedInstance.lastIncome, expectedMinimumIncome, 'lastIncome should reflect deterministic payout');
    assert.equal(state.money, 7, 'payout should queue until the next maintenance cycle');

    const beforeMaintenanceMoney = state.money;
    const upkeepCost = Number(blogDefinition.maintenance?.cost) || 0;
    allocateAssetMaintenance();

    updatedInstance = getAssetState('blog').instances.find(item => item.id === instanceId);
    assert.equal(
      state.money,
      beforeMaintenanceMoney - upkeepCost + expectedMinimumIncome,
      'queued payout should credit before new upkeep is deducted'
    );
    assert.equal(updatedInstance.pendingIncome, 0, 'payout queue should clear after maintenance runs');
  } finally {
    Math.random = originalRandom;
  }
});

test('payout breakdown captures upgrade boosts and clears on skipped upkeep', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const blogDefinition = getAssetDefinition('blog');
    const blogState = getAssetState('blog');
    blogState.instances = [createAssetInstance(blogDefinition, {
      status: 'active',
      daysRemaining: 0,
      daysCompleted: blogDefinition.setup.days,
      maintenanceFundedToday: false
    })];
    const instanceId = blogState.instances[0].id;

    const courseUpgrade = getUpgradeState('course');
    courseUpgrade.purchased = true;

    state.timeLeft = 10;
    state.money = 50;

    allocateAssetMaintenance();
    closeOutDay();

    let instance = getAssetState('blog').instances.find(item => item.id === instanceId);
    assert.ok(instance.lastIncome > 0, 'payout should register when upkeep is funded');
    assert.ok(instance.lastIncomeBreakdown, 'breakdown should be stored after payout');
    assert.equal(instance.lastIncomeBreakdown.total, instance.lastIncome, 'breakdown total should match payout');
    const baseEntry = instance.lastIncomeBreakdown.entries.find(entry => entry.id === 'base' || entry.type === 'base');
    assert.ok(baseEntry, 'base payout entry should exist');
    const upgradeEntry = instance.lastIncomeBreakdown.entries.find(entry => entry.id === 'course');
    assert.ok(upgradeEntry, 'automation course boost should be recorded');
    assert.ok(upgradeEntry.amount > 0, 'upgrade bonus should add payout value');

    state.timeLeft = 0;
    state.money = 0;
    allocateAssetMaintenance();
    closeOutDay();

    instance = getAssetState('blog').instances.find(item => item.id === instanceId);
    assert.equal(instance.lastIncome, 0, 'payout should reset when maintenance is skipped');
    assert.equal(instance.lastIncomeBreakdown, null, 'breakdown should clear after unpaid upkeep');
  } finally {
    Math.random = originalRandom;
  }
});

test('maintenance stalls when upkeep cash is unavailable', () => {
  const blogDefinition = getAssetDefinition('blog');
  const blogState = getAssetState('blog');
  blogState.instances = [createAssetInstance(blogDefinition, {
    status: 'active',
    daysRemaining: 0,
    daysCompleted: blogDefinition.setup.days,
    maintenanceFundedToday: false
  })];

  state.timeLeft = 10;
  state.money = 2; // below the $3 upkeep requirement

  allocateAssetMaintenance();

  const updatedInstance = getAssetState('blog').instances[0];
  assert.equal(updatedInstance.maintenanceFundedToday, false, 'maintenance should not fund without cash');
  assert.equal(state.timeLeft, 10, 'time should remain untouched when upkeep fails');
  assert.equal(state.money, 2, 'money should not be deducted when upkeep fails');
});

test('pending income stays queued when upkeep resources fall short', () => {
  const blogDefinition = getAssetDefinition('blog');
  const blogState = getAssetState('blog');
  blogState.instances = [createAssetInstance(blogDefinition, {
    status: 'active',
    daysRemaining: 0,
    daysCompleted: blogDefinition.setup.days,
    maintenanceFundedToday: false,
    pendingIncome: 2
  })];

  const state = getState();
  state.timeLeft = 10;
  state.money = 0;

  allocateAssetMaintenance();

  const updatedInstance = getAssetState('blog').instances[0];
  assert.equal(state.money, 0, 'money should not change when upkeep fails');
  assert.equal(updatedInstance.pendingIncome, 2, 'queued income should remain for future days');
  assert.equal(updatedInstance.maintenanceFundedToday, false, 'maintenance should remain unfunded');
});

test('knowledge tracks auto-advance after enrollment when time is available', () => {
  const trackDef = KNOWLEDGE_TRACKS.outlineMastery;
  const progress = getKnowledgeProgress('outlineMastery');
  assert.equal(progress.daysCompleted, 0, 'progress should start at zero');
  assert.equal(progress.completed, false, 'progress should not begin completed');

  state.money = trackDef.tuition + 500;
  state.timeLeft = trackDef.hoursPerDay + 4;

  enrollInKnowledgeTrack('outlineMastery');

  for (let day = 0; day < trackDef.days; day += 1) {
    advanceKnowledgeTracks();
    state.timeLeft = trackDef.hoursPerDay + 4;
    allocateDailyStudy();
  }

  const updated = getKnowledgeProgress('outlineMastery');
  assert.equal(updated.daysCompleted, trackDef.days, 'studied days should accumulate');
  assert.equal(updated.completed, true, 'track should mark completed after required days');
  assert.equal(updated.enrolled, false, 'completed tracks should unenroll automatically');

  advanceKnowledgeTracks();
  assert.equal(updated.daysCompleted, trackDef.days, 'extra cycles without studying should not change completion');
});
