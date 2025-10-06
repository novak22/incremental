import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefaultState } from '../../../src/core/state.js';
import { ensureSlice, getInstanceProgressSnapshot } from '../../../src/core/state/slices/actions.js';
import { collectOutstandingActionEntries } from '../../../src/ui/actions/outstanding.js';
import { loadRegistry, resetRegistry } from '../../../src/game/registryService.js';

function createTestDefinition() {
  return {
    id: 'test-hustle',
    name: 'Test Hustle',
    category: 'hustle',
    progress: {
      type: 'scheduled',
      completion: 'manual',
      hoursPerDay: 3,
      daysRequired: 4,
      hoursRequired: 12
    }
  };
}

test('outstanding entries mirror normalized progress snapshots', () => {
  resetRegistry();
  const definition = createTestDefinition();
  loadRegistry({ actions: [definition], assets: [], upgrades: [] });

  const state = buildDefaultState();
  state.day = 10;
  state.hustleMarket = { offers: [], accepted: [] };

  state.actions = state.actions || {};
  state.actions[definition.id] = {
    instances: [
      {
        id: 'instance-1',
        accepted: true,
        status: 'active',
        definitionId: definition.id,
        acceptedOnDay: state.day - 2,
        hoursRequired: 12,
        hoursLogged: 6,
        progress: {
          type: 'scheduled',
          hoursPerDay: 3,
          daysRequired: 4,
          daysCompleted: 2,
          hoursLogged: 6,
          lastWorkedDay: state.day - 1
        }
      }
    ]
  };

  ensureSlice(state);

  const normalizedInstance = state.actions[definition.id].instances[0];
  const snapshot = getInstanceProgressSnapshot(normalizedInstance);
  const [entry] = collectOutstandingActionEntries(state);

  assert.ok(entry, 'expected outstanding entry for the normalized instance');
  assert.equal(entry.instanceId, normalizedInstance.id);
  assert.equal(entry.definitionId, definition.id);

  const progress = entry.progress;
  assert.equal(progress.definitionId, definition.id);
  assert.equal(progress.instanceId, normalizedInstance.id);
  assert.equal(progress.hoursLogged, snapshot.hoursLogged);
  assert.equal(progress.hoursRequired, snapshot.hoursRequired);
  assert.equal(progress.hoursRemaining, snapshot.hoursRemaining);
  assert.equal(progress.hoursPerDay, snapshot.hoursPerDay);
  assert.equal(progress.daysCompleted, snapshot.daysCompleted);
  assert.equal(progress.daysRequired, snapshot.daysRequired);
  assert.equal(progress.completion, snapshot.completionMode || snapshot.completion);
  assert.equal(progress.percentComplete, snapshot.percentComplete);
  assert.equal(progress.lastWorkedDay, snapshot.lastWorkedDay);
});

test('outstanding entries stay in sync after progress updates', () => {
  resetRegistry();
  const definition = createTestDefinition();
  loadRegistry({ actions: [definition], assets: [], upgrades: [] });

  const state = buildDefaultState();
  state.day = 12;
  state.hustleMarket = { offers: [], accepted: [] };

  state.actions = state.actions || {};
  state.actions[definition.id] = {
    instances: [
      {
        id: 'instance-2',
        accepted: true,
        status: 'active',
        definitionId: definition.id,
        acceptedOnDay: state.day - 3,
        hoursRequired: 12,
        hoursLogged: 4,
        progress: {
          type: 'scheduled',
          hoursPerDay: 3,
          daysRequired: 4,
          daysCompleted: 1,
          hoursLogged: 4,
          lastWorkedDay: state.day - 1
        }
      }
    ]
  };

  ensureSlice(state);

  const normalizedInstance = state.actions[definition.id].instances[0];
  normalizedInstance.hoursLogged = 9;
  normalizedInstance.progress.hoursLogged = 9;
  normalizedInstance.progress.daysCompleted = 3;
  normalizedInstance.progress.lastWorkedDay = state.day;

  const snapshot = getInstanceProgressSnapshot(normalizedInstance);
  const [entry] = collectOutstandingActionEntries(state);

  assert.ok(entry, 'expected outstanding entry after progress change');
  const progress = entry.progress;
  assert.equal(progress.hoursLogged, snapshot.hoursLogged);
  assert.equal(progress.hoursRemaining, snapshot.hoursRemaining);
  assert.equal(progress.daysCompleted, snapshot.daysCompleted);
  assert.equal(progress.completion, snapshot.completionMode || snapshot.completion);
  assert.equal(progress.percentComplete, snapshot.percentComplete);
  assert.equal(progress.lastWorkedDay, snapshot.lastWorkedDay);
});
