import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from '../../../helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { stateModule, requirementsModule } = harness;
const { getState } = stateModule;
const { KNOWLEDGE_TRACKS } = requirementsModule;

const { resolveMarketSnapshot, buildStudyMarketConfig } = await import(
  '../../../../src/game/hustles/knowledge/offers.js'
);

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('study market config carries enrollment metadata', () => {
  const track = KNOWLEDGE_TRACKS.outlineMastery;
  const market = buildStudyMarketConfig(track);

  assert.equal(market.category, 'study');
  assert.equal(market.slotsPerRoll, 1);
  assert.equal(market.maxActive, 1);
  assert.equal(market.metadata.studyTrackId, track.id);
  assert.equal(market.metadata.seatPolicy, 'limited');
  assert.equal(market.variants.length, 1);
  assert.equal(market.variants[0].metadata.enrollment.seatPolicy, 'limited');
  assert.equal(market.variants[0].durationDays, track.days - 1);
});

test('resolveMarketSnapshot surfaces the current study seat', () => {
  const state = getState();
  const track = KNOWLEDGE_TRACKS.outlineMastery;

  state.day = 1;
  const snapshot = resolveMarketSnapshot(track, state);

  assert.ok(snapshot.offer, 'expected an enrollment offer to be active');
  assert.equal(snapshot.offer.definitionId, `study-${track.id}`);
  assert.ok(snapshot.offer.availableOnDay <= state.day, 'active offer should be available now');
});
