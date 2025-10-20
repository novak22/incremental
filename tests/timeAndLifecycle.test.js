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
const { buildActionQueue } = await import('../src/ui/actions/registry.js');
const todoWidgetModule = await import('../src/ui/views/browser/widgets/todoWidget.js');
const todoWidget = todoWidgetModule.default;

const { getState, getUpgradeState } = stateModule;
const layoutManagerModule = await import('../src/ui/views/browser/widgets/layoutManager.js');
const layoutManager = layoutManagerModule.default;
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
  layoutManager.__testables?.reset?.();
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

test('todo widget logging to zero hours ends the day automatically', async () => {
  const state = getState();
  state.day = 5;
  state.baseTime = 0;
  state.bonusTime = 0;
  state.dailyBonusTime = 0;
  state.timeLeft = 0;

  const { hustlesModule } = harness;
  const { HUSTLE_TEMPLATES, rollDailyOffers, acceptHustleOffer } = hustlesModule;

  const template = HUSTLE_TEMPLATES.find(definition => definition?.id === 'freelance') || HUSTLE_TEMPLATES[0];
  assert.ok(template, 'expected a hustle template to accept');

  const [offer] = rollDailyOffers({ templates: [template], day: state.day, now: Date.now(), state, rng: () => 0 });
  assert.ok(offer, 'expected rollDailyOffers to produce an offer');

  const acceptanceHours = Math.max(0, Number(template?.time ?? offer?.metadata?.time ?? 0));
  if (acceptanceHours > 0) {
    state.timeLeft = acceptanceHours;
    state.baseTime = acceptanceHours;
  }

  const accepted = acceptHustleOffer(offer.id, { state });
  assert.ok(accepted, 'expected the offer to be accepted');

  const actionState = state.actions?.[template.id];
  const instance = actionState?.instances?.find(entry => entry?.id === accepted.instanceId);
  assert.ok(instance, 'expected the accepted instance to exist in state');

  const requiredHours = Number(instance?.progress?.hoursRequired ?? accepted.hoursRequired ?? template.time ?? 1);
  state.baseTime = requiredHours;
  state.timeLeft = requiredHours;

  layoutManager.renderLayout();
  const queue = buildActionQueue({ state, summary: {} });
  const todoContainer = document.querySelector('[data-widget="todo"]');
  assert.ok(todoContainer, 'todo widget container should exist in the DOM');

  todoWidget.init({
    container: todoContainer,
    list: document.getElementById('browser-widget-todo-list'),
    note: document.getElementById('browser-widget-todo-note'),
    endDayButton: document.getElementById('browser-widget-todo-end'),
    focusGroup: todoContainer.querySelector('[data-focus-group]'),
    focusButtons: todoContainer.querySelectorAll('[data-focus]'),
    listWrapper: todoContainer.querySelector('.todo-widget__list-wrapper'),
    availableValue: document.getElementById('browser-widget-todo-available'),
    spentValue: document.getElementById('browser-widget-todo-spent')
  });
  todoWidget.render(queue);

  const startingDay = state.day;
  const startingLogLength = state.log.length;

  const executed = todoWidget.runNextTask();
  assert.equal(executed, true, 'todo widget should complete the queued task');
  assert.equal(state.timeLeft <= 0, true, 'time should be depleted after running the task');

  await new Promise(resolve => setTimeout(resolve, 550));

  assert.equal(state.day, startingDay + 1, 'day should advance automatically once time runs out');

  const newLogs = state.log.slice(startingLogLength);
  assert.ok(
    newLogs.some(entry => entry?.message?.includes('You ran out of time')),
    'auto end-of-day flow should log the exhaustion message'
  );
  assert.equal(state.timeLeft, getTimeCap(), 'time should reset to the full cap after ending the day');
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
