import test from 'node:test';
import assert from 'node:assert/strict';

const stateModule = await import('../src/core/state.js');
const {
  buildDefaultState,
  initializeState,
  getState,
  getActionState
} = stateModule;

const progressTemplates = await import('../src/game/actions/progress/templates.js');
const progressInstances = await import('../src/game/actions/progress/instances.js');
const registryService = await import('../src/game/registryService.js');
const { ensureRegistryReady } = await import('../src/game/registryBootstrap.js');

const { createInstanceProgress } = progressTemplates;
const {
  acceptActionInstance,
  advanceActionInstance,
  isCompletionSatisfied,
  resetActionInstance
} = progressInstances;

registryService.resetRegistry();
ensureRegistryReady();

test.beforeEach(() => {
  initializeState(buildDefaultState());
});

test('createInstanceProgress honors overrides and metadata fallbacks', () => {
  const definition = {
    id: 'template-check',
    progress: {
      hoursRequired: 6,
      hoursPerDay: 3,
      daysRequired: 2,
      completionMode: 'auto'
    }
  };

  const progress = createInstanceProgress(definition, {
    overrides: {
      hoursRequired: 8,
      progress: {
        hoursRequired: 7,
        hoursPerDay: 2,
        label: 'Override Label'
      }
    },
    metadata: {
      progressLabel: 'Metadata Label',
      progress: {
        completionMode: 'metadata-mode'
      }
    }
  });

  assert.equal(progress.hoursRequired, 7, 'override should take precedence over template requirement');
  assert.equal(progress.hoursPerDay, 2, 'hoursPerDay override should be applied');
  assert.equal(progress.daysRequired, 2, 'days requirement should come from template');
  assert.equal(progress.label, 'Override Label', 'label should prefer supplied override');
  assert.equal(progress.completionMode, 'metadata-mode', 'metadata completion mode should set completionMode');
});

test('advance and reset flows update progress snapshots', () => {
  const definition = {
    id: 'advance-flow',
    progress: {
      hoursRequired: 4,
      hoursPerDay: 2
    }
  };

  const state = getState();
  const instance = acceptActionInstance(definition, { state });
  const entry = getActionState(definition.id, state);
  assert.equal(entry.instances.length, 1, 'instance should be accepted');

  const advanceResult = advanceActionInstance(definition, instance, {
    state,
    day: 2,
    hours: 1.5,
    autoComplete: false
  });

  const stored = advanceResult.instance;
  assert.equal(stored.progress.dailyLog[2], 1.5, 'logged hours should store under the working day');
  assert.equal(stored.hoursLogged, 1.5, 'instance should track total hours logged');

  const resetResult = resetActionInstance(definition, stored, { state, clearCompletion: false });
  assert.equal(resetResult.hoursLogged, 0, 'reset should clear logged hours');
  assert.deepEqual(resetResult.progress.dailyLog, {}, 'reset should clear daily log entries');
});

test('isCompletionSatisfied requires meeting hour and day thresholds', () => {
  const definition = {
    id: 'completion-check',
    progress: {
      hoursRequired: 4,
      hoursPerDay: 2,
      daysRequired: 2
    }
  };

  const state = getState();
  const instance = acceptActionInstance(definition, { state });

  let result = advanceActionInstance(definition, instance, {
    state,
    day: 1,
    hours: 2,
    autoComplete: false
  });

  assert.equal(result.completed, false, 'requirements should not be satisfied after the first day');
  assert.equal(
    isCompletionSatisfied(definition, result.instance),
    false,
    'completion check should remain false until all conditions are met'
  );

  result = advanceActionInstance(definition, instance, {
    state,
    day: 2,
    hours: 2,
    autoComplete: false
  });

  assert.equal(result.completed, true, 'advance should report completion once thresholds are met');
  assert.equal(
    isCompletionSatisfied(definition, result.instance),
    true,
    'completion detection should validate both hour and day requirements'
  );
});
