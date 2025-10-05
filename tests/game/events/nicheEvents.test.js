import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from '../../helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const eventsModule = await import('../../../src/game/events/index.js');
const { getNicheEvents, advanceEventsAfterDay } = eventsModule;
const { NICHE_EVENT_BLUEPRINTS } = await import('../../../src/game/events/config.js');
const { getNicheDefinitions } = await import('../../../src/game/assets/nicheData.js');

const { stateModule } = harness;
const { getState } = stateModule;

function getActiveNicheEvents(state, nicheId) {
  return getNicheEvents(state, nicheId).filter(event => {
    if (!event) return false;
    if (event.remainingDays == null) return true;
    return Number(event.remainingDays) > 0;
  });
}

function withConstantRandom(value, callback) {
  const original = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = original;
  }
}

test.beforeEach(() => {
  harness.resetState();
});

test('each niche immediately receives a long-running trend', () => {
  const state = getState();
  const definitions = getNicheDefinitions();

  definitions.forEach(definition => {
    const active = getActiveNicheEvents(state, definition.id);
    assert.equal(active.length, 1, `expected exactly one active trend for ${definition.name}`);
    assert.ok(active[0].totalDays >= 5, 'trend should last multiple days');
  });
});

test('niche events persist for their full duration before rerolling', () => {
  const state = getState();
  const [definition] = getNicheDefinitions();
  assert.ok(definition, 'should have at least one niche definition');

  const [initial] = getActiveNicheEvents(state, definition.id);
  assert.ok(initial, 'expected a starting trend event');

  const duration = Number(initial.totalDays) || 1;
  let day = Number(state.day) || 1;

  for (let step = 0; step < duration - 1; step += 1) {
    const ended = advanceEventsAfterDay(day);
    const endedIds = ended.map(event => event.id);
    assert.ok(!endedIds.includes(initial.id), 'trend should not end prematurely');

    const stillActive = getActiveNicheEvents(state, definition.id).some(event => event.id === initial.id);
    assert.ok(stillActive, `trend should remain active through day ${day}`);

    day += 1;
    state.day = day;
  }

  const ended = advanceEventsAfterDay(day);
  const endedIds = ended.map(event => event.id);
  assert.ok(endedIds.includes(initial.id), 'trend should conclude once its schedule finishes');

  const replacement = getActiveNicheEvents(state, definition.id);
  assert.equal(replacement.length, 1, 'a new trend should immediately replace the finished event');
  assert.notEqual(replacement[0].id, initial.id, 'replacement trend should be distinct');
});

test('additional niche blueprints integrate into the selection pool', () => {
  const definitions = getNicheDefinitions();
  const targetDefinition = definitions[0];
  assert.ok(targetDefinition, 'should have a target niche for blueprint injection');

  const testBlueprint = {
    id: 'niche:testSpotlight',
    tone: 'neutral',
    label: ({ definition }) => `${definition?.name || 'Niche'} spotlight`,
    stat: 'income',
    modifierType: 'percent',
    appliesTo: ({ definition }) => definition?.id === targetDefinition.id,
    chance: () => 5,
    duration: () => 3,
    initialPercent: () => 0.15,
    dailyPercentChange: () => 0
  };

  NICHE_EVENT_BLUEPRINTS.push(testBlueprint);

  try {
    withConstantRandom(0.99, () => {
      harness.resetState();
    });

    const state = getState();
    const active = getActiveNicheEvents(state, targetDefinition.id);
    assert.equal(active.length, 1, 'target niche should still receive exactly one trend');
    const [event] = active;
    assert.equal(event.templateId, testBlueprint.id, 'new blueprint should be selected when its weight dominates');
    assert.equal(event.tone, 'neutral', 'event tone should reflect the injected blueprint');
    assert.equal(event.totalDays, 3, 'duration should originate from the injected blueprint');
    assert.equal(Number(event.currentPercent), 0.15, 'initial percent should match the blueprint configuration');
  } finally {
    NICHE_EVENT_BLUEPRINTS.pop();
    harness.resetState();
  }
});
