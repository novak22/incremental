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
const actionsProgressModule = await import('../src/game/actions/progress/instances.js');
const lifecycleModule = await import('../src/game/lifecycle.js');
const hustleMarketSlice = await import('../src/core/state/slices/hustleMarket/index.js');

const {
  buildDefaultState,
  initializeState,
  getState,
  getAssetState,
  getUpgradeState,
  getActionState
} = stateModule;
const { getAssetDefinition, getActionDefinition } = registryModule;
const { createAssetInstance } = assetStateModule;
const { allocateAssetMaintenance, closeOutDay, ASSETS, getIncomeRangeForDisplay } = assetsModule;
const { ACTIONS } = hustlesModule;
const { UPGRADES } = upgradesModule;
const {
  KNOWLEDGE_TRACKS,
  advanceKnowledgeTracks,
  allocateDailyStudy,
  enrollInKnowledgeTrack,
  getKnowledgeProgress
} = requirementsModule;
const { advanceActionInstance } = actionsProgressModule;
const { endDay } = lifecycleModule;
const { ensureHustleMarketState } = hustleMarketSlice;
const registryService = await import('../src/game/registryService.js');
const { ensureRegistryReady } = await import('../src/game/registryBootstrap.js');

registryService.resetRegistry();
ensureRegistryReady();

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

test('knowledge tracks advance after manual study logs', () => {
  const trackDef = KNOWLEDGE_TRACKS.outlineMastery;
  const progress = getKnowledgeProgress('outlineMastery');
  assert.equal(progress.daysCompleted, 0, 'progress should start at zero');
  assert.equal(progress.completed, false, 'progress should not begin completed');

  state.money = trackDef.tuition + 500;
  state.timeLeft = trackDef.hoursPerDay + 4;

  enrollInKnowledgeTrack('outlineMastery');

  const studyDefinition = getActionDefinition('study-outlineMastery');
  let studyInstance = stateModule.getActionState('study-outlineMastery').instances.at(-1);

  for (let dayOffset = 0; dayOffset < trackDef.days; dayOffset += 1) {
    const actionDay = state.day + dayOffset;
    advanceActionInstance(studyDefinition, studyInstance, {
      state,
      day: actionDay,
      hours: trackDef.hoursPerDay
    });
    state.day = actionDay;
    allocateDailyStudy();
    advanceKnowledgeTracks();
    studyInstance = stateModule.getActionState('study-outlineMastery').instances.at(-1);
  }

  state.day += 1;
  allocateDailyStudy();
  advanceKnowledgeTracks();

  const updated = getKnowledgeProgress('outlineMastery');
  assert.equal(updated.daysCompleted, trackDef.days, 'studied days should accumulate');
  assert.equal(updated.completed, true, 'track should mark completed after required days');
  assert.equal(updated.enrolled, false, 'completed tracks should unenroll automatically');

  advanceKnowledgeTracks();
  assert.equal(updated.daysCompleted, trackDef.days, 'extra cycles without studying should not change completion');
});

test('endDay resets action counters even when legacy hustle map is absent', () => {
  const actionDefinition = ACTIONS.find(action => action.id === 'freelance');
  assert.ok(actionDefinition, 'expected to find the freelance action definition');

  const actionState = getActionState(actionDefinition.id);
  actionState.runsToday = 3;
  actionState.lastRunDay = state.day;

  delete state.hustles;

  const startingDay = state.day;
  endDay(false);

  const updated = getActionState(actionDefinition.id);
  assert.equal(updated.runsToday, 0, 'action counters should reset after ending the day');
  assert.equal(updated.lastRunDay, state.day, 'lastRunDay should advance to the new day');
  assert.equal(state.day, startingDay + 1, 'day should increment when ending the day');
});

test('ensureHustleMarketState prunes expired offers and marks expired accepted entries', () => {
  const now = Date.now();
  state.day = 5;
  const today = state.day;

  state.hustleMarket.offers = [
    {
      id: 'expired-offer',
      templateId: 'freelance',
      definitionId: 'freelance',
      rolledOnDay: today - 4,
      availableOnDay: today - 4,
      expiresOnDay: today - 2,
      rolledAt: now
    },
    {
      id: 'active-offer',
      templateId: 'freelance',
      definitionId: 'freelance',
      rolledOnDay: today,
      availableOnDay: today,
      expiresOnDay: today + 1,
      rolledAt: now
    }
  ];

  state.hustleMarket.accepted = [
    {
      id: 'accepted-expired',
      offerId: 'expired-offer',
      templateId: 'freelance',
      definitionId: 'freelance',
      acceptedOnDay: today - 3,
      deadlineDay: today - 2,
      hoursRequired: 1,
      metadata: {}
    },
    {
      id: 'accepted-active',
      offerId: 'active-offer',
      templateId: 'freelance',
      definitionId: 'freelance',
      acceptedOnDay: today,
      deadlineDay: today + 1,
      hoursRequired: 1,
      metadata: {}
    }
  ];

  ensureHustleMarketState(state, { fallbackDay: today });

  assert.equal(state.hustleMarket.offers.length, 1, 'expired offers should be removed from the market');
  assert.equal(state.hustleMarket.offers[0].id, 'active-offer', 'active offers should remain available');
  assert.equal(state.hustleMarket.accepted.length, 2, 'accepted entries should be preserved for late completion processing');

  const expiredEntry = state.hustleMarket.accepted.find(entry => entry.id === 'accepted-expired');
  assert.ok(expiredEntry, 'expired accepted entries should remain in the market state');
  assert.equal(expiredEntry.status, 'expired', 'expired accepted entries should be marked expired');
  assert.equal(expiredEntry.expired, true, 'expired accepted entries should have the expired flag set');

  const activeEntry = state.hustleMarket.accepted.find(entry => entry.id === 'accepted-active');
  assert.ok(activeEntry, 'active accepted entries should remain after pruning');
  assert.equal(activeEntry.offerId, 'active-offer', 'active accepted entries should remain linked to their offer');
});
