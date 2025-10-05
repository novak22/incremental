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
const { maybeTriggerAssetEvents, triggerQualityActionEvents } = eventsModule;

const { stateModule, registryModule, assetStateModule } = harness;
const { getState, getAssetState } = stateModule;
const { getAssetDefinition } = registryModule;
const { createAssetInstance } = assetStateModule;

test.beforeEach(() => {
  harness.resetState();
});

test('payout events trigger from blueprint selection', () => {
  const restoreRandom = stubRandomSequence([0.01, 0.5]);

  try {
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

    assert.equal(created.length, 1);
    assert.equal(created[0].templateId, 'asset:viralTrend');
    const state = getState();
    assert.ok(
      state.events.active.some(event => event?.target?.instanceId === instance.id && event.templateId === 'asset:viralTrend'),
      'event should persist in state'
    );
  } finally {
    restoreRandom();
  }
});

test('quality action events trigger celebrations', () => {
  const restoreRandom = stubRandomSequence([0.01, 0.5]);

  try {
    const definition = getAssetDefinition('blog');
    const assetState = getAssetState('blog');
    const instance = createAssetInstance(definition, {
      status: 'active',
      quality: { level: 2, progress: {} }
    });
    assetState.instances = [instance];
    const action = definition.quality?.actions?.find(entry => entry.id === 'writePost');
    assert.ok(action, 'expected blog quality action "writePost"');

    const created = triggerQualityActionEvents({
      definition,
      assetState,
      instance,
      instanceIndex: 0,
      action
    });

    assert.equal(created.length, 1);
    assert.equal(created[0].templateId, 'asset:blogQualityCelebration');
  } finally {
    restoreRandom();
  }
});
