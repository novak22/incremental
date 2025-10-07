import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from '../../../helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { stateModule, requirementsModule } = harness;
const { getState } = stateModule;
const { KNOWLEDGE_TRACKS, getKnowledgeProgress } = requirementsModule;

const { createStudyCompletionHook } = await import('../../../../src/game/hustles/knowledge/completion.js');

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('study completion hook finalizes progress and awards skill XP once', () => {
  const state = getState();
  const track = KNOWLEDGE_TRACKS.outlineMastery;
  const progress = getKnowledgeProgress(track.id, state);

  progress.daysCompleted = 3;
  progress.skillRewarded = false;

  const instance = { completedOnDay: 11, progress: { daysCompleted: 4 } };
  const hook = createStudyCompletionHook(track);

  hook({ state, instance });

  assert.equal(progress.completed, true, 'completion flag should be set');
  assert.equal(progress.enrolled, false, 'enrollment flag should be cleared');
  assert.equal(progress.completedOnDay, 11, 'completion day should be tracked');
  assert.equal(progress.daysCompleted, 4, 'days completed should respect the largest recorded value');
  assert.equal(progress.hoursPerDay, track.hoursPerDay, 'hours per day should sync to track defaults');

  assert.equal(progress.skillRewarded, true, 'skill rewards should only be granted once');
  assert.ok(instance.skillXpAwarded > 0, 'first completion should grant skill XP');

  const repeatInstance = {};
  hook({ state, instance: repeatInstance });
  assert.equal(repeatInstance.skillXpAwarded, undefined, 'repeat completions should not re-award XP');
});
