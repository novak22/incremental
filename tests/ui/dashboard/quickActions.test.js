import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuickActions } from '../../../src/ui/dashboard/quickActions.js';
import { buildDefaultState } from '../../../src/core/state.js';
import { loadRegistry, resetRegistry } from '../../../src/game/registryService.js';
import { rollDailyOffers } from '../../../src/game/hustles.js';

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

test('buildQuickActions returns guidance when no market offers exist', () => {
  resetRegistry();
  loadRegistry({ hustles: [quickStub], assets: [], upgrades: [] });

  const state = buildDefaultState();
  const actions = buildQuickActions(state);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].id, 'hustles:no-offers');
  assert.equal(actions[0].primaryLabel, 'Check back tomorrow');
  assert.equal(actions[0].onClick, null);
});

test('buildQuickActions returns active offers with meta details', () => {
  resetRegistry();
  loadRegistry({ hustles: [quickStub], assets: [], upgrades: [] });

  const state = buildDefaultState();
  rollDailyOffers({ templates: [quickStub], day: state.day, state, rng: () => 0 });

  const actions = buildQuickActions(state);
  const offerAction = actions.find(item => item.offer);
  assert.ok(offerAction, 'expected market offer to be present');
  assert.equal(offerAction.primaryLabel, 'Accept');
  assert.ok(offerAction.meta.includes('$120'));
  assert.ok(offerAction.meta.includes('1 day'));
});
