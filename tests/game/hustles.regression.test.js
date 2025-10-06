import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';
import { getGameTestHarness } from '../helpers/gameTestHarness.js';
import { acceptAndCompleteInstantHustle } from '../helpers/hustleActions.js';

async function withUpdateSpy(updateModule) {
  const calls = [];
  const invalidation = await import('../../src/core/events/invalidationBus.js');
  const originalUpdate = updateModule.updateUI;
  updateModule.teardownUpdateSubscriptions();
  const unsubscribe = invalidation.subscribeToInvalidation(dirty => {
    calls.push(dirty);
    originalUpdate(dirty);
  });
  return {
    calls,
    restore() {
      unsubscribe();
      updateModule.ensureUpdateSubscriptions();
    }
  };
}

test('instant hustles still trigger UI flush through the invalidation bus', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const updateModule = await import('../../src/ui/update.js');

  const spy = await withUpdateSpy(updateModule);

  t.after(() => {
    spy.restore();
  });

  const state = harness.resetState();
  state.money = 250;
  state.timeLeft = 40;

  const instantHustle = harness.hustlesModule.ACTIONS.find(
    hustle => typeof hustle?.getPrimaryOfferAction === 'function' || typeof hustle?.action?.resolvePrimaryAction === 'function'
  );
  assert.ok(instantHustle, 'expected to find an instant hustle definition');

  acceptAndCompleteInstantHustle(instantHustle, state, {
    flushAfterAccept: true,
    flushAfterCompletion: true
  });

  assert.ok(spy.calls.length > 0, 'expected updateUI to be invoked for hustle action');
  const latestCall = spy.calls[spy.calls.length - 1];
  assert.equal(latestCall?.cards, true, 'expected cards section to be marked dirty');
});

test('game loop publishes dirty sections for long-running hustles', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const updateModule = await import('../../src/ui/update.js');
  const loopModule = await import('../../src/game/loop.js');

  const spy = await withUpdateSpy(updateModule);

  const originalHustles = [...harness.hustlesModule.ACTIONS];
  harness.hustlesModule.ACTIONS.splice(0, harness.hustlesModule.ACTIONS.length, {
    id: 'test-hustle',
    process() {
      return { dashboard: true };
    }
  });

  t.after(() => {
    harness.hustlesModule.ACTIONS.splice(0, harness.hustlesModule.ACTIONS.length, ...originalHustles);
    spy.restore();
  });

  loopModule.runGameLoop();

  assert.ok(spy.calls.length > 0, 'expected updateUI to respond to loop invalidation');
  const latestCall = spy.calls[spy.calls.length - 1];
  assert.equal(latestCall?.dashboard, true, 'expected dashboard section to be marked dirty');
});
