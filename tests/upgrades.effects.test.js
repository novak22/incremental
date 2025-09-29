import assert from 'node:assert/strict';
import test from 'node:test';

import {
  configureRegistry,
  getUpgradeDefinition,
  initializeState
} from '../src/core/state.js';
import {
  buildSlotLedger,
  describeSlotLedger,
  getAssetEffectMultiplier,
  getExclusiveConflict,
  wouldExceedSlotCapacity
} from '../src/game/upgrades/effects.js';

function makeUpgrade(definition) {
  return {
    type: 'upgrade',
    defaultState: { purchased: false },
    requirements: [],
    effects: {},
    affects: {},
    provides: {},
    consumes: {},
    exclusivityGroup: null,
    ...definition
  };
}

test('quality progress multipliers stack multiplicatively for matching assets', () => {
  configureRegistry({
    upgrades: [
      makeUpgrade({
        id: 'course',
        effects: { quality_progress_mult: 2 },
        affects: { assets: { ids: ['blog'] }, actions: { types: ['quality'] } }
      }),
      makeUpgrade({
        id: 'pipeline',
        effects: { quality_progress_mult: 1.5 },
        affects: { assets: { ids: ['blog'] }, actions: { types: ['quality'] } }
      })
    ],
    assets: [],
    hustles: []
  });

  const state = initializeState();
  state.upgrades.course = { purchased: true };
  state.upgrades.pipeline = { purchased: true };

  const subject = { id: 'blog', tags: ['writing'] };
  const effect = getAssetEffectMultiplier(subject, 'quality_progress_mult', {
    actionType: 'quality',
    state
  });

  assert.equal(effect.multiplier, 3, 'quality progress should multiply');
  assert.equal(effect.sources.length, 2);
});

test('exclusive conflicts ignore prerequisite upgrades but block peers', () => {
  configureRegistry({
    upgrades: [
      makeUpgrade({
        id: 'basicRig',
        exclusivityGroup: 'tech:pc'
      }),
      makeUpgrade({
        id: 'advancedRig',
        exclusivityGroup: 'tech:pc',
        requirements: [{ type: 'upgrade', id: 'basicRig' }]
      }),
      makeUpgrade({
        id: 'sideRig',
        exclusivityGroup: 'tech:pc'
      })
    ],
    assets: [],
    hustles: []
  });

  const state = initializeState();
  state.upgrades.basicRig = { purchased: true };
  state.upgrades.sideRig = { purchased: true };

  const advanced = getUpgradeDefinition('advancedRig');
  assert.equal(
    getExclusiveConflict(advanced, { state }),
    getUpgradeDefinition('sideRig'),
    'should block conflicting sidegrade'
  );

  state.upgrades.sideRig = { purchased: false };
  const noConflict = getExclusiveConflict(advanced, { state });
  assert.equal(noConflict, null, 'prerequisite should not cause a conflict');
});

test('slot ledger tracks provided and consumed capacity for repeatables', () => {
  configureRegistry({
    upgrades: [
      makeUpgrade({
        id: 'monitorHub',
        provides: { monitor: 2 }
      }),
      makeUpgrade({
        id: 'colorMonitor',
        repeatable: true,
        consumes: { monitor: 1 }
      })
    ],
    assets: [],
    hustles: []
  });

  const state = initializeState();
  state.upgrades.monitorHub = { purchased: true };
  state.upgrades.colorMonitor = { purchased: true, count: 1 };

  const ledger = buildSlotLedger({ state });
  const summary = describeSlotLedger('monitor', ledger);
  assert.deepEqual(summary, { slot: 'monitor', provided: 2, consumed: 1, available: 1 });

  assert.equal(wouldExceedSlotCapacity(getUpgradeDefinition('colorMonitor'), { state }), false);

  state.upgrades.colorMonitor = { purchased: true, count: 2 };
  assert.equal(
    wouldExceedSlotCapacity(getUpgradeDefinition('colorMonitor'), { state }),
    'monitor',
    'should flag when attempting to exceed slot capacity'
  );
});
