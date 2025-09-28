import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const {
  stateModule,
  timeModule,
  currencyModule,
  lifecycleModule
} = harness;

const { getState, getUpgradeState } = stateModule;
const { getTimeCap, spendTime, gainTime } = timeModule;
const { addMoney, spendMoney } = currencyModule;
const { endDay, checkDayEnd } = lifecycleModule;

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('time cap reflects base, bonus, and daily boosts', () => {
  const state = getState();
  state.baseTime = 10;
  state.bonusTime = 2;
  state.dailyBonusTime = 3;
  assert.equal(getTimeCap(), 15);
});

test('spend and gain time respect caps and minimums', () => {
  const state = getState();
  state.timeLeft = 5;
  spendTime(10);
  assert.equal(state.timeLeft, 0);
  state.baseTime = 12;
  state.bonusTime = 2;
  state.dailyBonusTime = 1;
  gainTime(20);
  assert.equal(state.timeLeft, getTimeCap());
});

test('currency adjustments clamp to zero and log events', () => {
  const state = getState();
  const startingMoney = state.money;
  addMoney(25, 'Test windfall', 'info');
  assert.equal(state.money, startingMoney + 25);
  assert.match(state.log.at(-1).message, /Test windfall/);
  spendMoney(9999);
  assert.equal(state.money, 0);
});

test('ending the day resets time and coffee usage', () => {
  const state = getState();
  state.day = 3;
  state.timeLeft = 0;
  state.baseTime = 10;
  state.bonusTime = 2;
  state.dailyBonusTime = 5;
  getUpgradeState('coffee').usedToday = 2;

  endDay(false);

  assert.equal(state.day, 4);
  assert.equal(state.timeLeft, getTimeCap());
  assert.equal(state.dailyBonusTime, 0);
  assert.equal(getUpgradeState('coffee').usedToday, 0);
  assert.match(state.log.at(-1).message, /Day 4 begins/);
});

test('checkDayEnd automatically triggers end-of-day sequence', async () => {
  const state = getState();
  state.day = 1;
  state.timeLeft = 0;
  const before = state.log.length;

  checkDayEnd();

  await new Promise(resolve => setTimeout(resolve, 450));

  assert.ok(state.day >= 2, 'day should increment after automatic end');
  assert.ok(state.log.length > before, 'logs should be written');
});
