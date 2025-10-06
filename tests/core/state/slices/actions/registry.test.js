import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureSlice, getSliceState } from '../../../../../src/core/state/slices/actions/index.js';
import { configureRegistry } from '../../../../../src/core/state/registry.js';
import { loadRegistry, resetRegistry } from '../../../../../src/game/registryService.js';

const definition = {
  id: 'client-delivery',
  category: 'hustle',
  defaultState: {
    runsToday: 0,
    lastRunDay: 0,
    instances: []
  },
  progress: {
    type: 'scheduled',
    completion: 'manual',
    hoursPerDay: 2,
    daysRequired: 2,
    hoursRequired: 4
  }
};

test('ensureSlice wires registry defaults and migrates legacy hustle state', () => {
  resetRegistry();
  loadRegistry({ actions: [definition], assets: [], upgrades: [] });
  configureRegistry();

  const state = {
    day: 6,
    actions: {},
    hustles: {
      [definition.id]: {
        runsToday: 3,
        lastRunDay: 5,
        instances: [
          {
            id: 'legacy',
            accepted: true,
            acceptedOnDay: 4,
            status: 'active',
            hoursRequired: 4,
            hoursLogged: 2
          }
        ],
        legacyNote: 'keep-me'
      }
    },
    progress: { knowledge: {} }
  };

  const slice = ensureSlice(state);
  assert.strictEqual(slice, state.actions, 'ensureSlice should return the canonical slice map');
  const entry = getSliceState(state, definition.id);
  assert.equal(entry.runsToday, 3, 'legacy runs should migrate when defaults are untouched');
  assert.equal(entry.lastRunDay, 5, 'legacy last run should migrate when defaults are untouched');
  assert.equal(entry.legacyNote, 'keep-me', 'custom fields should be preserved during migration');
  assert.equal(entry.instances.length, 1, 'legacy instances should be normalized onto the slice');
  const [instance] = entry.instances;
  assert.equal(instance.progress.hoursPerDay, 2, 'normalized instance should reference definition progress defaults');
  assert.equal(instance.accepted, true);
});
