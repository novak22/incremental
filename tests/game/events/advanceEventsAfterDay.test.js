import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from '../../helpers/gameTestHarness.js';

function stubRandomSequence(sequence) {
  const values = Array.from(sequence);
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => {
    const value = values[index] ?? values[values.length - 1] ?? 0.5;
    index += 1;
    return value;
  };
  return () => {
    Math.random = originalRandom;
  };
}

const harness = await getGameTestHarness();
const eventsModule = await import('../../../src/game/events/index.js');
const { maybeTriggerAssetEvents, advanceEventsAfterDay } = eventsModule;

const { stateModule, registryModule, assetStateModule } = harness;
const { getState, getAssetState } = stateModule;
const { getAssetDefinition } = registryModule;
const { createAssetInstance } = assetStateModule;

test.beforeEach(() => {
  harness.resetState();
});

test('advanceEventsAfterDay logs and removes finished asset events', () => {
  const restoreRandom = stubRandomSequence([0.01, 0.5, 0.99]);

  try {
    const state = getState();
    state.day = 1;

    const definition = getAssetDefinition('blog');
    const assetState = getAssetState('blog');
    const instance = createAssetInstance(definition, {
      status: 'active',
      quality: { level: 3, progress: {} }
    });
    assetState.instances = [instance];

    const created = maybeTriggerAssetEvents({
      definition,
      assetState,
      instance,
      instanceIndex: 0,
      trigger: 'payout'
    });

    assert.equal(created.length, 1, 'expected an event to be created');
    const event = created[0];
    event.remainingDays = 1;
    event.currentPercent = 0;
    event.dailyPercentChange = 0;

    const logCountBefore = state.log.length;
    const ended = advanceEventsAfterDay(state.day + 1);

    const hasAssetEvent = state.events.active.some(
      active => active?.target?.type === 'assetInstance' && active.target.instanceId === instance.id
    );
    assert.equal(hasAssetEvent, false, 'event should be removed once finished');
    assert.equal(ended.length, 1, 'advanceEventsAfterDay should report ended events');
    assert.ok(state.log.length > logCountBefore, 'a wrap-up log entry should increase log count');
    const newMessages = state.log.slice(logCountBefore).map(entry => entry?.message || '');
    assert.ok(
      newMessages.some(message => message.includes('Payouts glide back toward normal.')),
      'a wrap-up log entry should be recorded'
    );
  } finally {
    restoreRandom();
  }
});
