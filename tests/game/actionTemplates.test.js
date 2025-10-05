import test from 'node:test';
import assert from 'node:assert/strict';

import { getGameTestHarness } from '../helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { stateModule } = harness;

const {
  createContractTemplate,
  createStudyTemplate
} = await import('../../src/game/actions/templates/contract.js');

test.beforeEach(() => {
  harness.resetState();
});

test('contract template applies availability and progress defaults', () => {
  const template = createContractTemplate({
    id: 'test-contract-template',
    name: 'Test Contract',
    defaultState: {},
    dailyLimit: 3
  }, {
    progress: {
      type: 'instant',
      completion: 'instant',
      hoursRequired: 2
    }
  });

  assert.deepEqual(template.availability, { type: 'dailyLimit', limit: 3 });
  assert.deepEqual(template.expiry, { type: 'permanent' });
  assert.ok(Array.isArray(template.defaultState.instances));

  const state = stateModule.getState();
  const instance = template.acceptInstance({ state });
  assert.equal(instance.progress.type, 'instant');
  assert.equal(instance.progress.completion, 'instant');
  assert.equal(instance.progress.hoursRequired, 2);
  assert.equal(stateModule.getActionState('test-contract-template', state).instances.length > 0, true);
});

test('contract template merges accept overrides with defaults', () => {
  const template = createContractTemplate({
    id: 'project-contract-template',
    name: 'Project Contract',
    defaultState: {}
  }, {
    progress: {
      type: 'project',
      completion: 'deferred',
      hoursPerDay: 2
    }
  });

  const state = stateModule.getState();
  const instance = template.acceptInstance({
    state,
    overrides: {
      hoursRequired: 12,
      progress: {
        completion: 'manual',
        hoursPerDay: 3,
        label: 'Client Work'
      }
    }
  });

  assert.equal(instance.hoursRequired, 12);
  assert.equal(instance.progress.type, 'project');
  assert.equal(instance.progress.completion, 'manual');
  assert.equal(instance.progress.hoursPerDay, 3);
  assert.equal(instance.progress.label, 'Client Work');
});

test('study template enforces enrollable availability and manual completion', () => {
  const template = createStudyTemplate({
    id: 'study-contract-template',
    name: 'Study Template',
    defaultState: {}
  }, {
    progress: {
      hoursPerDay: 4,
      daysRequired: 5
    }
  });

  assert.deepEqual(template.availability, { type: 'enrollable' });
  assert.equal(template.progress.type, 'study');
  assert.equal(template.progress.completion, 'manual');

  const state = stateModule.getState();
  const instance = template.acceptInstance({ state });
  assert.equal(instance.progress.type, 'study');
  assert.equal(instance.progress.hoursPerDay, 4);
  assert.equal(instance.progress.daysRequired, 5);
});

test('contract template invokes accept hooks with context payload', () => {
  const events = [];
  const template = createContractTemplate({
    id: 'hooked-contract-template',
    name: 'Hooked Contract',
    defaultState: {}
  }, {
    progress: { type: 'project', completion: 'manual' },
    accept: {
      hooks: [context => {
        events.push({
          phase: 'array',
          definitionId: context.definition.id,
          instanceId: context.instance.id,
          day: Number(context.state?.day) || null
        });
      }],
      onAccepted: context => {
        events.push({
          phase: 'single',
          metadata: context.metadata,
          overrides: context.overrides
        });
      }
    }
  });

  const state = stateModule.getState();
  const metadata = { label: 'Hook Metadata', time: 3 };
  const overrides = { deadlineDay: 7 };
  const instance = template.acceptInstance({ state, metadata, overrides });

  assert.ok(instance);
  assert.equal(events.length, 2);
  assert.equal(events[0].definitionId, 'hooked-contract-template');
  assert.equal(events[1].metadata.label, 'Hook Metadata');
  assert.equal(events[1].overrides.deadlineDay, 7);
});
