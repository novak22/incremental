import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const {
  stateModule,
  hustlesModule,
  requirementsModule,
  offlineModule
} = harness;

const { getState, getHustleState } = stateModule;
const { getKnowledgeProgress } = requirementsModule;

const {
  HUSTLES,
  scheduleFlip,
  updateFlipStatus,
  processFlipPayouts
} = hustlesModule;

const { handleOfflineProgress } = offlineModule;

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('scheduleFlip queues pending flip with future payout', () => {
  const flipState = getHustleState('flips');
  assert.equal(flipState.pending.length, 0);
  scheduleFlip();
  assert.equal(flipState.pending.length, 1);
  const flip = flipState.pending[0];
  assert.ok(flip.readyAt > Date.now());
});

test('processFlipPayouts awards money and clears completed flips', () => {
  const state = getState();
  const flipState = getHustleState('flips');
  flipState.pending.push({ id: 'flip1', readyAt: Date.now() - 1000, payout: 48 });
  const beforeMoney = state.money;

  const result = processFlipPayouts(Date.now(), false);

  assert.equal(result.changed, true);
  assert.ok(state.money > beforeMoney);
  assert.equal(flipState.pending.length, 0);
  assert.match(state.log.at(-1).message, /eBay flip/);
});

test('updateFlipStatus reflects pending queue details', () => {
  const flipState = getHustleState('flips');
  flipState.pending = [
    { id: 'flip1', readyAt: Date.now() + 1500, payout: 48 },
    { id: 'flip2', readyAt: Date.now() + 5000, payout: 48 }
  ];
  const element = document.createElement('div');
  updateFlipStatus(element);
  assert.match(element.textContent, /2 flips in progress/);
});

test('study hustles consume time and mark progress', () => {
  const state = getState();
  const studyHustle = HUSTLES.find(hustle => hustle.id.startsWith('study-outlineMastery'));
  const track = getKnowledgeProgress('outlineMastery');
  state.timeLeft = track.hoursPerDay + 1;

  studyHustle.action.onClick();

  assert.ok(track.studiedToday);
  assert.equal(state.timeLeft, 1);
  assert.match(state.log.at(-1).message, /invested/);
});

test('offline progress processes completed flips and logs summary', () => {
  const state = getState();
  const flipState = getHustleState('flips');
  flipState.pending.push({ id: 'offline', readyAt: Date.now() - 10000, payout: 60 });
  const moneyBefore = state.money;
  const logBefore = state.log.length;

  handleOfflineProgress(Date.now() - 60000);

  assert.ok(state.money > moneyBefore, 'money should increase from offline flips');
  assert.ok(state.log.length >= logBefore + 2, 'should log flip payout and offline reminder');
});
