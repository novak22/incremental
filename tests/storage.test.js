import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const {
  stateModule,
  storageModule,
  logModule
} = harness;

const { getState, getAssetState, getUpgradeState } = stateModule;
const { loadState, saveState, getStatePersistence } = storageModule;
const { addLog } = logModule;

const STORAGE_KEY = 'online-hustle-sim-v2';

const resetState = () => harness.resetState();

test.beforeEach(() => {
  localStorage.clear();
  resetState();
});

test('loadState initializes defaults and welcomes new players', () => {
  const result = loadState({
    onFirstLoad: () =>
      addLog('Welcome to Online Hustle Simulator! Time to make that side cash.', 'info')
  });
  assert.equal(result.returning, false);
  assert.ok(result.state);
  assert.match(getState().log.at(-1).message, /Welcome to Online Hustle Simulator/);
  assert.equal(getState().version, getStatePersistence().version);
});

test('saveState persists current progress and loadState restores it', () => {
  const state = getState();
  state.money = 321;
  const blogState = getAssetState('blog');
  blogState.instances.push({ status: 'active', daysRemaining: 0, daysCompleted: 1 });

  saveState();
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.equal(saved.money, 321);
  assert.ok(saved.assets.blog.instances.length >= 1);
  assert.equal(saved.version, getStatePersistence().version);

  const loaded = loadState();
  assert.equal(loaded.returning, true);
  assert.equal(getState().money, 321);
  assert.ok(getAssetState('blog').instances.length >= 1);
  assert.equal(getState().version, getStatePersistence().version);
});

test('legacy saves migrate to new asset structure', () => {
  const legacy = {
    money: 500,
    timeLeft: 7,
    day: 12,
    blog: {
      active: true,
      buffer: 80,
      instances: [
        { active: true, totalIncome: 300 },
        { active: false }
      ]
    },
    assistantHired: true,
    coffeesToday: 2,
    log: [{ id: 'legacy', message: 'Legacy entry', timestamp: Date.now(), type: 'info' }]
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

  const result = loadState();
  const state = getState();
  assert.equal(result.returning, true);
  assert.equal(state.money, 500);
  assert.equal(getAssetState('blog').instances.length, 2);
  assert.equal(getUpgradeState('assistant').count, 1);
  assert.equal(getUpgradeState('coffee').usedToday, 2);
  assert.ok(state.log.some(entry => entry.message === 'Legacy entry'));
  assert.equal(state.version, getStatePersistence().version);
});
