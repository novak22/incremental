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
  performQualityAction,
  sellAssetInstance,
  calculateAssetSalePrice
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
        daysCompleted: blogDefinition.setup.days - 1
      }),
      createAssetInstance(blogDefinition, {
        status: 'active'
      })
    ];
    const activeId = blogState.instances[1].id;
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
    assert.equal(state.money, 0, 'income should queue until the next maintenance sweep');

    allocateAssetMaintenance();

    const refreshedBlog = getAssetState('blog');
    const refreshedActive = refreshedBlog.instances.find(instance => instance.id === activeId);
    const upkeepCost = Number(blogDefinition.maintenance?.cost) || 0;
    if (refreshedActive.maintenanceFundedToday) {
      const expectedNet = Math.max(0, refreshedActive.lastIncome - upkeepCost);
      assert.equal(state.money, expectedNet, 'queued income should credit when upkeep is funded');
      assert.equal(refreshedActive.pendingIncome, 0, 'payout queue should clear after the maintenance sweep');
    } else {
      assert.equal(state.money, 0, 'queued income should stay pending when upkeep is skipped');
      assert.equal(
        refreshedActive.pendingIncome,
        refreshedActive.lastIncome,
        'payout queue should persist when upkeep cannot run'
      );
    }
  } finally {
    Math.random = originalRandom;
  }
});

test('income range for display reflects quality floor and ceiling', () => {
  const range = getIncomeRangeForDisplay('blog');
  assert.equal(range.min, 1);
  assert.equal(range.max, 38);
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
    performQualityAction('blog', instanceId, 'writePost');

    updatedInstance = getAssetState('blog').instances.find(item => item.id === instanceId);
    assert.equal(updatedInstance.quality.level, 1);
    assert.equal(state.timeLeft, 24 - 12, 'quality actions should spend time');

    // Next payout reflects new tier
    updatedInstance.maintenanceFundedToday = true;
    closeOutDay();
    updatedInstance = getAssetState('blog').instances.find(item => item.id === instanceId);
    assert.equal(updatedInstance.lastIncome, 6);
    assert.ok(state.log.some(entry => /Quality 1/.test(entry.message)));
  } finally {
    Math.random = originalRandom;
  }
});

test('quality action cooldown blocks repeat work until the next day', () => {
  const state = getState();
  state.money = 500;
  state.timeLeft = 24;

  const blogState = getAssetState('blog');
  const instance = createAssetInstance(blogDefinition, { status: 'active' });
  blogState.instances = [instance];

  const instanceId = instance.id;
  const startingTime = state.timeLeft;

  performQualityAction('blog', instanceId, 'seoSprint');
  assert.ok(Math.abs(state.timeLeft - (startingTime - 2.5)) < 1e-6, 'first sprint should spend time');

  const afterFirstSprint = state.timeLeft;
  performQualityAction('blog', instanceId, 'seoSprint');
  assert.ok(Math.abs(state.timeLeft - afterFirstSprint) < 1e-6, 'cooldown should block repeat time spend');

  state.day += 1;
  state.timeLeft = 24;
  performQualityAction('blog', instanceId, 'seoSprint');
  assert.ok(Math.abs(state.timeLeft - (24 - 2.5)) < 1e-6, 'cooldown should clear on the next day');
});

test('selling an asset instance removes it and pays out last income multiplier', () => {
  const state = getState();
  state.money = 0;
  const instance = createAssetInstance(blogDefinition, { status: 'active' });
  instance.lastIncome = 42;
  getAssetState('blog').instances = [instance];

  const expectedPrice = calculateAssetSalePrice(instance);
  const sold = sellAssetInstance(blogDefinition, instance.id);

  assert.equal(sold, true, 'sellAssetInstance should report success');
  assert.equal(getAssetState('blog').instances.length, 0, 'instance removed after sale');
  assert.equal(state.money, expectedPrice, 'sale price added to money');

  const saleMetric = state.metrics.daily.payouts[`asset:${blogDefinition.id}:sale`];
  assert.ok(saleMetric, 'sale should be recorded in metrics');
  assert.equal(saleMetric.amount, expectedPrice);
});
