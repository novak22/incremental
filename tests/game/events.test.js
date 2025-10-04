import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSET_EVENT_BLUEPRINTS, NICHE_EVENT_BLUEPRINTS } from '../../src/game/events/config.js';
import { getGameTestHarness } from '../helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const eventsModule = await import('../../src/game/events/index.js');
const { maybeTriggerAssetEvents, triggerQualityActionEvents, advanceEventsAfterDay } = eventsModule;

const { stateModule, registryModule, assetStateModule } = harness;
const { getState, getAssetState } = stateModule;
const { getAssetDefinition } = registryModule;
const { createAssetInstance } = assetStateModule;

const expectedAssetBlueprintIds = [
  'asset:viralTrend',
  'asset:platformSetback',
  'asset:blogQualityCelebration',
  'asset:vlogQualityCelebration',
  'asset:dropshippingQualityCelebration',
  'asset:saasQualityCelebration',
  'asset:ebookQualityCelebration',
  'asset:stockPhotosQualityCelebration'
];

const expectedNicheBlueprintIds = ['niche:trendWave', 'niche:trendDip'];

test.beforeEach(() => {
  harness.resetState();
});

test('asset event blueprints retain expected ordering', () => {
  const ids = ASSET_EVENT_BLUEPRINTS.map(blueprint => blueprint.id);
  assert.deepEqual(ids, expectedAssetBlueprintIds);
});

test('niche event blueprints retain expected ordering', () => {
  const ids = NICHE_EVENT_BLUEPRINTS.map(blueprint => blueprint.id);
  assert.deepEqual(ids, expectedNicheBlueprintIds);
});

test('payout events still trigger from blueprint selection', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.01;

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
    Math.random = originalRandom;
  }
});

test('quality action events still trigger celebrations', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.01;

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
    Math.random = originalRandom;
  }
});

test('niche trend blueprints spawn events when the roll succeeds', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.01;

  try {
    const state = getState();
    state.day = 3;
    advanceEventsAfterDay(3);
    const templates = state.events.active.map(event => event.templateId);
    for (const id of expectedNicheBlueprintIds) {
      assert.ok(templates.includes(id), `expected niche event ${id} to spawn`);
    }
  } finally {
    Math.random = originalRandom;
  }
});
