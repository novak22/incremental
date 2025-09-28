import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from './helpers/setupDom.js';

ensureTestDom();

const stateModule = await import('../src/core/state.js');
const assetsModule = await import('../src/game/assets.js');
const hustlesModule = await import('../src/game/hustles.js');
const upgradesModule = await import('../src/game/upgrades.js');
const requirementsModule = await import('../src/game/requirements.js');

const {
  configureRegistry,
  buildDefaultState,
  initializeState,
  getState,
  getAssetDefinition,
  getAssetState,
  createAssetInstance
} = stateModule;
const { allocateAssetMaintenance, closeOutDay, ASSETS } = assetsModule;
const { HUSTLES } = hustlesModule;
const { UPGRADES } = upgradesModule;
const { advanceKnowledgeTracks, markKnowledgeStudied, getKnowledgeProgress } = requirementsModule;

configureRegistry({ assets: ASSETS, hustles: HUSTLES, upgrades: UPGRADES });

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
    daysCompleted: 0,
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
    state.timeLeft = 10;
    state.money = 0;

    allocateAssetMaintenance();

    let updatedInstance = getAssetState('blog').instances[0];
    assert.equal(updatedInstance.maintenanceFundedToday, true, 'maintenance should be funded when hours remain');
    assert.equal(state.timeLeft, 9, 'maintenance should consume daily hours');

    closeOutDay();

    const expectedMinimumIncome = Math.round(blogDefinition.income.base * (1 - blogDefinition.income.variance));
    updatedInstance = getAssetState('blog').instances[0];
    assert.equal(updatedInstance.lastIncome, expectedMinimumIncome, 'lastIncome should reflect deterministic payout');
    assert.equal(state.money, expectedMinimumIncome, 'daily payout should add to player money');
  } finally {
    Math.random = originalRandom;
  }
});

test('knowledge tracks advance only on studied days and mark completion', () => {
  const progress = getKnowledgeProgress('outlineMastery');
  assert.equal(progress.daysCompleted, 0, 'progress should start at zero');
  assert.equal(progress.completed, false, 'progress should not begin completed');

  for (let day = 0; day < 3; day += 1) {
    markKnowledgeStudied('outlineMastery');
    advanceKnowledgeTracks();
  }

  const updated = getKnowledgeProgress('outlineMastery');
  assert.equal(updated.daysCompleted, 3, 'studied days should accumulate');
  assert.equal(updated.completed, true, 'track should mark completed after required days');

  advanceKnowledgeTracks();
  assert.equal(updated.daysCompleted, 3, 'extra cycles without studying should not change completion');
});
