import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from '../../helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const eventsModule = await import('../../../src/core/state/events.js');
const gameEventsModule = await import('../../../src/game/events/index.js');
const { addEvent } = eventsModule;
const { advanceEventsAfterDay } = gameEventsModule;
const { syncNicheTrendSnapshots } = await import('../../../src/game/events/syncNicheTrendSnapshots.js');

const { stateModule } = harness;
const { getState } = stateModule;

const NICHE_ID = 'techInnovators';

function getSnapshot(state, nicheId = NICHE_ID) {
  return state?.niches?.popularity?.[nicheId] ?? null;
}

test.beforeEach(() => {
  harness.resetState();
});

test('syncNicheTrendSnapshots caches event-driven popularity and preserves history', () => {
  const originalRandom = Math.random;
  Math.random = () => 1;
  try {
    const state = getState();
    state.day = 1;

    state.events.active = state.events.active.filter(event => event?.target?.type !== 'niche');

    addEvent(state, {
      templateId: 'test-niche-trend',
      label: 'Test Trend',
      stat: 'income',
      modifierType: 'percent',
      target: { type: 'niche', nicheId: NICHE_ID },
      currentPercent: 0.25,
      dailyPercentChange: -0.05,
      totalDays: 3,
      remainingDays: 3,
      createdOnDay: state.day,
      lastProcessedDay: state.day - 1
    });

    syncNicheTrendSnapshots(state);

    let snapshot = getSnapshot(state);
    assert.ok(snapshot, 'trend snapshot should exist after syncing');
    assert.equal(snapshot.score, 75, 'score should reflect aggregated percent boost');
    assert.equal(snapshot.previousScore, 50, 'previous score should track neutral baseline');
    assert.equal(snapshot.delta, 25, 'delta should compare against previous score');
    assert.equal(snapshot.multiplier, 1.25, 'multiplier should mirror event payout impact');
    assert.equal(snapshot.label, 'Surging', 'label should match computed score band');

    advanceEventsAfterDay(state.day);
    syncNicheTrendSnapshots(state);

    snapshot = getSnapshot(state);
    assert.equal(snapshot.score, 70, 'score should decay with event daily change');
    assert.equal(snapshot.previousScore, 75, 'previous score should capture prior reading');
    assert.equal(snapshot.delta, -5, 'delta should update relative to previous score');

    syncNicheTrendSnapshots(state);
    const repeated = getSnapshot(state);
    assert.equal(repeated.previousScore, snapshot.previousScore, 're-sync should not reset previous score');
    assert.equal(repeated.delta, snapshot.delta, 're-sync should keep existing delta when unchanged');

    state.day += 1;
    advanceEventsAfterDay(state.day);
    syncNicheTrendSnapshots(state);

    snapshot = getSnapshot(state);
    assert.ok(snapshot.score <= 65, 'score should continue trending toward neutral');
    assert.ok(snapshot.previousScore >= 70, 'previous score should retain last active value');
    const lastActiveScore = snapshot.score;

    state.day += 1;
    advanceEventsAfterDay(state.day);
    syncNicheTrendSnapshots(state);

    snapshot = getSnapshot(state);
    const activeTrends = state.events.active.filter(
      event => event?.target?.type === 'niche' && event.target.nicheId === NICHE_ID
    );
    assert.equal(activeTrends.length, 1, 'niche should immediately receive a replacement trend');
    assert.notEqual(
      activeTrends[0].templateId,
      'test-niche-trend',
      'replacement trend should differ from the injected test blueprint'
    );
    assert.notEqual(snapshot.multiplier, 1, 'replacement trend should keep payouts in motion');
    assert.equal(
      snapshot.previousScore,
      lastActiveScore,
      'previous score should capture the final reading from the prior trend'
    );
    assert.equal(
      Math.round(snapshot.delta),
      Math.round(snapshot.score - snapshot.previousScore),
      'delta should track the swing between previous and current scores'
    );
  } finally {
    Math.random = originalRandom;
  }
});
