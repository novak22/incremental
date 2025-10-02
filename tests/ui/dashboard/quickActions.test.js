import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuickActions } from '../../../src/ui/dashboard/quickActions.js';
import { buildDefaultState } from '../../../src/core/state.js';
import { loadRegistry, resetRegistry } from '../../../src/game/registryService.js';

const quickStub = {
  id: 'hustle:test',
  name: 'Turbo Mock Hustle',
  tag: { type: 'venture' },
  payout: { amount: 120 },
  time: 1,
  action: {
    label: () => 'Queue turbo',
    onClick: () => 'queued',
    timeCost: 1,
    disabled: () => false
  }
};

test('buildQuickActions returns hustles sorted with meta details', () => {
  resetRegistry();
  loadRegistry({ hustles: [quickStub], assets: [], upgrades: [] });

  const state = buildDefaultState();
  const actions = buildQuickActions(state);
  const action = actions.find(item => item.id === quickStub.id);
  assert.ok(action, 'expected quick hustle to be present');
  assert.equal(action.meta, '$120 • 1h');
  assert.equal(action.primaryLabel, 'Queue turbo');
});
