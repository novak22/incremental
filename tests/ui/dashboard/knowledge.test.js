import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudyEnrollmentActionModel } from '../../../src/ui/dashboard/knowledge.js';
import { buildDefaultState } from '../../../src/core/state.js';
import { loadRegistry, resetRegistry } from '../../../src/game/registryService.js';
import { KNOWLEDGE_TRACKS } from '../../../src/game/requirements.js';

test('buildStudyEnrollmentActionModel surfaces active study commitments', () => {
  resetRegistry();

  const trackId = 'outlineMastery';
  const track = KNOWLEDGE_TRACKS[trackId];

  const actionId = `study-${trackId}`;
  const instanceId = 'study-instance';

  loadRegistry({
    hustles: [
      {
        id: actionId,
        name: track.name,
        tag: { type: 'study' },
        description: track.description,
        progress: {
          type: 'study',
          completion: 'manual',
          hoursPerDay: track.hoursPerDay,
          daysRequired: track.days
        }
      }
    ],
    assets: [],
    upgrades: []
  });

  const state = buildDefaultState();
  state.day = 7;
  state.baseTime = 6;
  state.bonusTime = 0;
  state.dailyBonusTime = 0;
  state.timeLeft = 4;
  state.money = 500;

  state.progress.knowledge = state.progress.knowledge || {};
  state.progress.knowledge[trackId] = {
    daysCompleted: 2,
    studiedToday: false,
    completed: false,
    enrolled: true,
    totalDays: track.days,
    hoursPerDay: track.hoursPerDay,
    tuitionCost: track.tuition ?? 0,
    enrolledOnDay: state.day - 2,
    skillRewarded: false
  };

  state.actions = state.actions || {};
  state.actions[actionId] = {
    id: actionId,
    instances: [
      {
        id: instanceId,
        name: track.name,
        accepted: true,
        completed: false,
        acceptedOnDay: state.day - 2,
        progress: {
          definitionId: actionId,
          instanceId,
          studyTrackId: trackId,
          type: 'study',
          hoursPerDay: track.hoursPerDay,
          daysRequired: track.days,
          hoursLogged: track.hoursPerDay * 2,
          hoursRemaining: Math.max(0, (track.days - 2) * track.hoursPerDay),
          stepHours: track.hoursPerDay,
          daysCompleted: 2,
          remainingDays: Math.max(0, track.days - 2),
          completion: 'manual',
          metadata: { day: state.day }
        }
      }
    ]
  };

  const model = buildStudyEnrollmentActionModel(state);
  assert.equal(model.entries.length, 1, 'expected one active study entry');
  const [entry] = model.entries;
  assert.equal(entry.definitionId, actionId);
  assert.equal(entry.instanceId, instanceId);
  assert.equal(entry.buttonLabel, 'Log study session');
  assert.ok(entry.meta.includes('per day'));
  assert.ok(entry.meta.includes('remaining'));
  assert.equal(entry.progress.instanceId, instanceId);
  assert.ok(model.hoursAvailableLabel.includes('h'));
});

test('buildStudyEnrollmentActionModel hides study entries once the day is logged', () => {
  resetRegistry();

  const trackId = 'outlineMastery';
  const track = KNOWLEDGE_TRACKS[trackId];
  const actionId = `study-${trackId}`;
  const instanceId = 'study-instance';

  loadRegistry({
    hustles: [
      {
        id: actionId,
        name: track.name,
        tag: { type: 'study' },
        description: track.description,
        progress: {
          type: 'study',
          completion: 'manual',
          hoursPerDay: track.hoursPerDay,
          daysRequired: track.days
        }
      }
    ],
    assets: [],
    upgrades: []
  });

  const state = buildDefaultState();
  state.day = 11;
  state.timeLeft = 6;
  state.money = 200;

  state.progress.knowledge = state.progress.knowledge || {};
  state.progress.knowledge[trackId] = {
    daysCompleted: 4,
    studiedToday: true,
    completed: false,
    enrolled: true,
    totalDays: track.days,
    hoursPerDay: track.hoursPerDay,
    tuitionCost: track.tuition ?? 0,
    enrolledOnDay: state.day - 4,
    skillRewarded: false
  };

  state.actions = state.actions || {};
  state.actions[actionId] = {
    id: actionId,
    instances: [
      {
        id: instanceId,
        name: track.name,
        accepted: true,
        completed: false,
        acceptedOnDay: state.day - 4,
        progress: {
          definitionId: actionId,
          instanceId,
          studyTrackId: trackId,
          type: 'study',
          hoursPerDay: track.hoursPerDay,
          daysRequired: track.days,
          hoursLogged: track.hoursPerDay * 4,
          hoursRemaining: Math.max(0, (track.days - 4) * track.hoursPerDay),
          stepHours: track.hoursPerDay,
          daysCompleted: 4,
          remainingDays: Math.max(0, track.days - 4),
          completion: 'manual',
          dailyLog: { [state.day]: track.hoursPerDay },
          metadata: { day: state.day }
        }
      }
    ]
  };

  const model = buildStudyEnrollmentActionModel(state);
  assert.equal(model.entries.length, 0, 'study entry should be hidden after logging for the day');
});
