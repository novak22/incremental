import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeProgressLog,
  normalizeInstanceProgress,
  getInstanceProgressSnapshot
} from '../../../../../src/core/state/slices/actions/progress.js';

const definition = {
  id: 'practice-session',
  progress: {
    type: 'scheduled',
    completion: 'manual',
    hoursPerDay: 2,
    daysRequired: 3,
    hoursRequired: 6
  }
};

test('normalizeProgressLog aggregates hours per day and ignores invalid entries', () => {
  const log = {
    1: 1.25,
    2: '1.5',
    '-3': 4,
    4: -1,
    extra: 'nope'
  };

  const normalized = normalizeProgressLog(log);
  assert.deepEqual(normalized, { 1: 5.25, 2: 1.5 });
});

test('normalizeInstanceProgress merges template defaults and derives hours from log', () => {
  const instance = {
    hoursRequired: '7',
    deadlineDay: 5,
    progress: {
      hoursPerDay: null,
      daysCompleted: '1',
      hoursLogged: null,
      lastWorkedDay: 0,
      dailyLog: {
        1: 2,
        2: '3.5',
        6: 'invalid'
      }
    }
  };

  const progress = normalizeInstanceProgress(definition, instance);
  assert.equal(progress.type, 'scheduled');
  assert.equal(progress.completion, 'manual');
  assert.equal(progress.hoursPerDay, null, 'null source should resolve to zero and clear hoursPerDay');
  assert.equal(progress.hoursRequired, 6, 'template hours should win when source progress is unset');
  assert.equal(progress.daysRequired, 3, 'template daysRequired should be carried forward');
  assert.equal(progress.deadlineDay, 5, 'deadline should be copied from instance when provided');
  assert.equal(progress.hoursLogged, 0, 'explicit progress hours override derived totals');
  assert.equal(progress.daysCompleted, 1, 'fallback daysCompleted should be respected when hours per day is unknown');
  assert.equal(progress.lastWorkedDay, 2, 'last worked day should mirror the final valid log day');
});

test('getInstanceProgressSnapshot reflects normalized progress metrics', () => {
  const instance = {
    id: 'instance-1',
    definitionId: definition.id,
    hoursRequired: 6,
    acceptedOnDay: 3,
    progress: normalizeInstanceProgress(definition, {
      hoursLogged: 4,
      progress: {
        hoursPerDay: 2,
        daysCompleted: 2,
        dailyLog: { 1: 2, 2: 2 },
        lastWorkedDay: 4
      }
    })
  };

  const snapshot = getInstanceProgressSnapshot(instance);
  assert.equal(snapshot.definitionId, definition.id);
  assert.equal(snapshot.instanceId, 'instance-1');
  assert.equal(snapshot.hoursLogged, 4);
  assert.equal(snapshot.hoursRequired, 6);
  assert.equal(snapshot.hoursRemaining, 2);
  assert.equal(snapshot.daysCompleted, 2);
  assert.equal(snapshot.daysRequired, 3);
  assert.equal(snapshot.lastWorkedDay, 2);
  assert.equal(snapshot.completion, 'manual');
  assert.equal(snapshot.percentComplete, 4 / 6);
});
