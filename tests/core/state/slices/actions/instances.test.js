import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldRetireInstance,
  normalizeActionState
} from '../../../../../src/core/state/slices/actions/instances.js';

const definition = {
  id: 'writing-gig',
  defaultState: {
    runsToday: 0,
    lastRunDay: 0,
    instances: []
  },
  progress: {
    type: 'scheduled',
    completion: 'manual',
    hoursPerDay: 2,
    daysRequired: 3,
    hoursRequired: 6
  }
};

test('shouldRetireInstance keeps recent completions but retires stale history', () => {
  const currentDay = 10;
  assert.equal(shouldRetireInstance({ completedOnDay: 10 }, currentDay), false);
  assert.equal(shouldRetireInstance({ completedOnDay: 9 }, currentDay), true);
  assert.equal(shouldRetireInstance({ progress: { completedOnDay: 8 } }, currentDay), true);
  assert.equal(shouldRetireInstance({ progress: { lastWorkedDay: 10 } }, currentDay), false);
});

test('normalizeActionState trims retired instances while preserving active progress', () => {
  const context = { state: { day: 10 } };
  const entry = {
    runsToday: 5,
    instances: [
      {
        id: 'active',
        status: 'active',
        accepted: true,
        acceptedOnDay: 9,
        hoursRequired: 6,
        hoursLogged: 2
      },
      {
        id: 'recent-complete',
        status: 'completed',
        completed: true,
        completedOnDay: 10,
        hoursRequired: 6,
        hoursLogged: 6
      },
      {
        id: 'stale-complete',
        status: 'completed',
        completed: true,
        completedOnDay: 8,
        hoursRequired: 6,
        hoursLogged: 6
      }
    ]
  };

  const normalized = normalizeActionState(definition, entry, context);
  assert.equal(normalized.runsToday, 5);
  assert.equal(normalized.instances.length, 2, 'stale completions should be retired');
  const ids = normalized.instances.map(instance => instance.id).sort();
  assert.deepEqual(ids, ['active', 'recent-complete']);
  const active = normalized.instances.find(instance => instance.id === 'active');
  assert.equal(active.progress.hoursPerDay, 2, 'active instance progress should be normalized');
  assert.equal(active.progress.daysRequired, 3);
});
