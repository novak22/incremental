import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const {
  stateModule,
  timeModule,
  currencyModule,
  lifecycleModule,
  assistantModule
} = harness;

const { getState, getUpgradeState } = stateModule;
const { getTimeCap, spendTime, gainTime } = timeModule;
const { addMoney, spendMoney } = currencyModule;
const { endDay, checkDayEnd } = lifecycleModule;
const {
  ASSISTANT_CONFIG,
  getAssistantCount,
  hireAssistant,
  fireAssistant,
  processAssistantPayroll
} = assistantModule;

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

test('spend and gain time allow negative overflow and respect caps', () => {
  const state = getState();
  state.timeLeft = 5;
  spendTime(10);
  assert.equal(state.timeLeft, -5);
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

test('assistant payroll charges wages and firing removes bonus hours', () => {
  const state = getState();
  state.money = 500;
  state.timeLeft = 5;
  const baseBonus = state.bonusTime;

  const hired = hireAssistant();
  assert.equal(hired, true, 'assistant should hire successfully');
  assert.equal(getAssistantCount(), 1, 'one assistant should be active');
  assert.equal(state.bonusTime, baseBonus + ASSISTANT_CONFIG.hoursPerAssistant, 'bonus time should increase');

  state.money = 40;
  processAssistantPayroll();
  assert.equal(state.money, 40 - (ASSISTANT_CONFIG.hourlyRate * ASSISTANT_CONFIG.hoursPerAssistant), 'payroll should deduct funds');

  state.timeLeft = 1;
  const fired = fireAssistant();
  assert.equal(fired, true, 'assistant should fire successfully');
  assert.equal(getAssistantCount(), 0, 'no assistants should remain');
  assert.equal(state.bonusTime, baseBonus, 'bonus time should drop back to baseline');
  assert.equal(
    state.timeLeft,
    1 - ASSISTANT_CONFIG.hoursPerAssistant,
    'time left should reflect lost support hours'
  );
});
