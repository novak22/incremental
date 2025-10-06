import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';

ensureTestDom();

const stateModule = await import('../../src/core/state.js');
const { initializeState, getState } = stateModule;
const registryService = await import('../../src/game/registryService.js');
const { ensureRegistryReady } = await import('../../src/game/registryBootstrap.js');
const { createInstantHustle } = await import('../../src/game/content/schema/assetActions.js');
const { createDailyLimitTracker } = await import('../../src/game/content/schema/assetActions/execution.js');

function ensureConfigured() {
  registryService.resetRegistry();
  ensureRegistryReady();
}

test('daily limit tracker reserves, consumes, and resets usage each new day', () => {
  ensureConfigured();
  initializeState();
  const state = getState();
  const metadata = { id: 'limitTracker', dailyLimit: 2 };
  const {
    resolveDailyUsage,
    reserveDailyUsage,
    releaseDailyUsage,
    consumeDailyUsage
  } = createDailyLimitTracker(metadata);

  let usage = resolveDailyUsage(state, { sync: true });
  assert.equal(usage.used, 0);
  assert.equal(usage.pending, 0);
  assert.equal(usage.remaining, 2);

  const reserved = reserveDailyUsage(state);
  assert.ok(reserved, 'reservation should succeed while capacity remains');
  assert.equal(reserved.pending, 1);
  assert.equal(reserved.used, 0);
  assert.equal(reserved.remaining, 1);

  usage = resolveDailyUsage(state, { sync: false });
  assert.equal(usage.used, 0);
  assert.equal(usage.pending, 1);
  assert.equal(usage.remaining, 1);

  const released = releaseDailyUsage(state);
  assert.equal(released.pending, 0);
  assert.equal(released.used, 0);
  assert.equal(released.remaining, 2);

  const reReserved = reserveDailyUsage(state);
  assert.ok(reReserved, 're-reservation should succeed after release');
  assert.equal(reReserved.pending, 1);
  assert.equal(reReserved.remaining, 1);

  const consumed = consumeDailyUsage(state);
  assert.equal(consumed.used, 1);
  assert.equal(consumed.pending, 0);
  assert.equal(consumed.remaining, 1);

  usage = resolveDailyUsage(state, { sync: false });
  assert.equal(usage.used, 1);
  assert.equal(usage.pending, 0);
  assert.equal(usage.remaining, 1);

  state.day = 2;
  usage = resolveDailyUsage(state, { sync: true });
  assert.equal(usage.used, 0);
  assert.equal(usage.pending, 0);
  assert.equal(usage.remaining, 2);
});

test('execution hooks grant payouts and emit log messages', () => {
  ensureConfigured();
  initializeState();
  const state = getState();
  state.money = 0;
  state.log.length = 0;

  const definition = createInstantHustle({
    id: 'payoutRun',
    name: 'Payout Run',
    time: 0,
    cost: 0,
    payout: {
      amount: 42,
      grantOnAction: true,
      logType: 'hustle',
      message: context => `Paid ${context.finalPayout}`
    }
  });

  definition.action.onClick();

  assert.equal(state.money, 42);
  assert.ok(state.log.length > 0, 'payout should log a message');
  const payoutLog = state.log[state.log.length - 1];
  assert.equal(payoutLog.message, 'Paid 42');
  assert.equal(payoutLog.type, 'hustle');
});

test('blocked hustle runs emit warning logs', () => {
  ensureConfigured();
  initializeState();
  const state = getState();
  state.money = 0;
  state.log.length = 0;

  const definition = createInstantHustle({
    id: 'limitRun',
    name: 'Limit Run',
    time: 0,
    cost: 0,
    dailyLimit: 1,
    payout: {
      amount: 10,
      grantOnAction: true,
      logType: 'hustle',
      message: 'First payout'
    }
  });

  definition.action.onClick();
  const logsAfterFirstRun = state.log.length;
  definition.action.onClick();

  assert.equal(state.log.length, logsAfterFirstRun + 1);
  const blockedLog = state.log[state.log.length - 1];
  assert.match(blockedLog.message, /Daily limit reached/);
  assert.equal(blockedLog.type, 'warning');
});
