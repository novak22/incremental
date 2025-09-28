import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const {
  stateModule,
  assetsModule,
  currencyModule
} = harness;

const {
  getState,
  getAssetState,
  getAssetDefinition,
  createAssetInstance
} = stateModule;

const {
  allocateAssetMaintenance,
  closeOutDay,
  getIncomeRangeForDisplay,
  performQualityAction
} = assetsModule;

const { spendMoney } = currencyModule;

const resetState = () => harness.resetState();

const blogDefinition = getAssetDefinition('blog');
const vlogDefinition = getAssetDefinition('vlog');

test.beforeEach(() => {
  resetState();
});

test('starting an asset spends resources and queues setup', () => {
  const state = getState();
  state.money = 200;
  const originalTime = state.timeLeft;
  const action = blogDefinition.action;

  action.onClick();

  const blogState = getAssetState('blog');
  assert.equal(blogState.instances.length, 1);
  const instance = blogState.instances[0];
  assert.equal(instance.status, 'setup');
  assert.equal(instance.setupFundedToday, true);
  assert.equal(state.money, 200 - blogDefinition.setup.cost);
  assert.equal(state.timeLeft, originalTime - blogDefinition.setup.hoursPerDay);
  assert.match(state.log.at(-1).message, /queued|outlined|kicked off/i);
});

test('maintenance allocation funds available assets and logs skipped ones', () => {
  const state = getState();
  state.money = 1000;
  state.timeLeft = 2;
  getAssetState('blog').instances = [createAssetInstance(blogDefinition, { status: 'active' })];
  getAssetState('vlog').instances = [createAssetInstance(vlogDefinition, { status: 'active' })];

  allocateAssetMaintenance();

  const blogInstance = getAssetState('blog').instances[0];
  const vlogInstance = getAssetState('vlog').instances[0];
  assert.equal(blogInstance.maintenanceFundedToday, true);
  assert.equal(vlogInstance.maintenanceFundedToday, false);
  assert.ok(state.timeLeft < 2.5, 'time should be spent on maintenance');
  const lastTwo = state.log.slice(-2).map(entry => entry.message);
  assert.ok(lastTwo.some(message => /Daily upkeep handled/.test(message)));
  assert.ok(lastTwo.some(message => /missed upkeep/.test(message)));
});

test('closing out the day advances setup and pays income when funded', () => {
  const originalRandom = Math.random;
  Math.random = () => 1; // guarantee maximum payout

  try {
    const state = getState();
    state.money = 0;
    const blogState = getAssetState('blog');
    blogState.instances = [
      createAssetInstance(blogDefinition, {
        status: 'setup',
        daysRemaining: 1,
        daysCompleted: 0
      }),
      createAssetInstance(blogDefinition, {
        status: 'active'
      })
    ];
    blogState.instances[0].setupFundedToday = true;
    blogState.instances[1].maintenanceFundedToday = true;

    closeOutDay();

    const updatedBlog = getAssetState('blog');
    const [setupInstance, activeInstance] = updatedBlog.instances;
    assert.equal(setupInstance.status, 'active', 'setup asset should become active');
    assert.equal(setupInstance.daysRemaining, 0);
    assert.equal(setupInstance.daysCompleted, blogDefinition.setup.days);
    assert.ok(state.log.some(entry => /is live/.test(entry.message)));

    assert.ok(activeInstance.lastIncome > 0, 'active instance should earn income');
    assert.equal(state.money, activeInstance.lastIncome, 'income added to money');
  } finally {
    Math.random = originalRandom;
  }
});

test('income range for display reflects quality floor and ceiling', () => {
  const range = getIncomeRangeForDisplay('blog');
  assert.equal(range.min, 1);
  assert.equal(range.max, 120);
});

test('spending money during maintenance does not go negative', () => {
  const state = getState();
  state.money = 10;
  spendMoney(25);
  assert.equal(state.money, 0);
});

test('quality actions invest resources and unlock stronger income tiers', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const state = getState();
    state.money = 200;
    state.timeLeft = 24;

    const blogState = getAssetState('blog');
    const instance = createAssetInstance(blogDefinition, { status: 'active' });
    blogState.instances = [instance];
    const instanceId = instance.id;

    // Baseline payout at quality 0
    instance.maintenanceFundedToday = true;
    closeOutDay();
    let updatedInstance = getAssetState('blog').instances.find(item => item.id === instanceId);
    assert.equal(updatedInstance.quality.level, 0);
    assert.equal(updatedInstance.lastIncome, 1);

    // Invest in posts to reach Quality 1
    performQualityAction('blog', instanceId, 'writePost');
    performQualityAction('blog', instanceId, 'writePost');
    performQualityAction('blog', instanceId, 'writePost');

    updatedInstance = getAssetState('blog').instances.find(item => item.id === instanceId);
    assert.equal(updatedInstance.quality.level, 1);
    assert.equal(state.timeLeft, 24 - 9, 'quality actions should spend time');

    // Next payout reflects new tier
    updatedInstance.maintenanceFundedToday = true;
    closeOutDay();
    updatedInstance = getAssetState('blog').instances.find(item => item.id === instanceId);
    assert.equal(updatedInstance.lastIncome, 10);
    assert.ok(state.log.some(entry => /Quality 1/.test(entry.message)));
  } finally {
    Math.random = originalRandom;
  }
});
