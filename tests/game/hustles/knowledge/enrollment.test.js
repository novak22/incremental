import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from '../../../helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { stateModule, requirementsModule } = harness;
const { getState } = stateModule;
const { KNOWLEDGE_TRACKS, getKnowledgeProgress } = requirementsModule;

const { createStudyAcceptHook } = await import('../../../../src/game/hustles/knowledge/enrollment.js');

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('study acceptance hook seeds metadata and processes tuition', () => {
  const state = getState();
  const track = KNOWLEDGE_TRACKS.outlineMastery;
  const progress = getKnowledgeProgress(track.id, state);

  state.day = 7;
  state.money = track.tuition + 500;

  const metadata = {};
  const instance = { acceptedOnDay: 9, progress: {} };
  const hook = createStudyAcceptHook(track);

  hook({ state, metadata, instance });

  assert.equal(typeof instance.__finalizeStudyAcceptance, 'function');
  assert.equal(typeof instance.__cancelStudyAcceptance, 'function');

  const beforeMoney = state.money;
  instance.__finalizeStudyAcceptance();

  assert.equal(progress.enrolled, true, 'progress should reflect enrollment');
  assert.equal(progress.completed, false, 'enrollment should not auto-complete the track');
  assert.equal(progress.enrolledOnDay, 9, 'accepted day should sync to progress');
  assert.equal(progress.tuitionPaid, track.tuition, 'tuition should be tracked on progress');
  assert.equal(progress.tuitionPaidOnDay, 9, 'tuition payment day should be recorded');

  assert.equal(state.money, beforeMoney - track.tuition, 'tuition should be deducted from the player');

  assert.equal(metadata.studyTrackId, track.id, 'metadata should identify the study track');
  assert.equal(metadata.tuitionPaid, track.tuition, 'metadata should reflect paid tuition');
  assert.equal(metadata.enrollment.enrolledOnDay, 9, 'enrollment metadata should capture the day claimed');
  assert.equal(metadata.progress.label, `Study ${track.name}`, 'progress metadata should apply a label');
  assert.equal(
    metadata.progress.hoursPerDay,
    track.hoursPerDay,
    'progress metadata should inherit study hours'
  );

  assert.equal(instance.__finalizeStudyAcceptance, undefined, 'finalize hook should clean itself up');
  assert.equal(instance.__cancelStudyAcceptance, undefined, 'cancel hook should be removed after finalize');
});
