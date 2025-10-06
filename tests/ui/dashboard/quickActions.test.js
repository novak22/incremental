import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuickActions } from '../../../src/ui/dashboard/quickActions.js';
import { buildDefaultState } from '../../../src/core/state.js';
import { loadRegistry, resetRegistry } from '../../../src/game/registryService.js';
import { rollDailyOffers } from '../../../src/game/hustles.js';
import {
  resolveOfferHours,
  resolveOfferPayout,
  resolveOfferSchedule,
  describeQuickActionOfferMeta,
  describeHustleOfferMeta
} from '../../../src/ui/hustles/offerHelpers.js';

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
  assert.match(offerAction.meta, /\$120/);
  assert.match(offerAction.meta, /Expires in/i);
});

test('buildQuickActions disables offers when requirements are unmet', () => {
  resetRegistry();
  const lockedStub = {
    ...quickStub,
    id: 'hustle:locked',
    name: 'Locked Hustle',
    requirements: [{ type: 'experience', assetId: 'blog', count: 1 }]
  };
  loadRegistry({ hustles: [lockedStub], assets: [], upgrades: [] });

  const state = buildDefaultState();
  rollDailyOffers({ templates: [lockedStub], day: state.day, state, rng: () => 0 });

  const actions = buildQuickActions(state);
  const lockedAction = actions.find(item => item.offer);
  assert.ok(lockedAction, 'expected locked market offer to be present');
  assert.equal(lockedAction.disabled, true, 'offer should report disabled status');
  assert.ok(lockedAction.meta.includes('Unlock tip'), 'meta should hint at the missing requirement');
  assert.ok(lockedAction.disabledReason.includes('Unlock') || lockedAction.disabledReason.includes('Daily'), 'disabled reason should surface guidance');
});

test('offer helper resolves fields with custom number resolver', () => {
  const offer = {
    metadata: {
      hoursRequired: 'invalid',
      requirements: { hours: '6' },
      payoutAmount: '275',
      payout: { schedule: 'daily' }
    }
  };
  const template = { time: '8', payout: { amount: '500' } };
  const toNumber = value => {
    if (value === '6') return 6;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : NaN;
  };

  assert.equal(resolveOfferHours(offer, template, { toNumber }), 6);
  assert.equal(resolveOfferPayout(offer, template, { toNumber }), 275);
  assert.equal(resolveOfferSchedule(offer), 'daily');
});

test('quick action offer summary highlights payout schedule and remaining days', () => {
  const summary = describeQuickActionOfferMeta({
    payout: 300,
    schedule: 'daily',
    durationText: '4h',
    remainingDays: 2,
    formatMoneyFn: value => value.toString()
  });
  assert.equal(summary, '$300 / day • 4h • Expires in 2 days');
});

test('hustle offer summary includes availability, focus, and completion cues', () => {
  const offer = {
    availableOnDay: 5,
    expiresOnDay: 8,
    metadata: {
      hoursRequired: 6,
      hoursPerDay: 2,
      daysRequired: 3,
      payout: { amount: 450, schedule: 'onCompletion' },
      completionMode: 'manual',
      progressLabel: 'Deliver reports'
    }
  };
  const meta = describeHustleOfferMeta({
    offer,
    definition: { time: 7 },
    currentDay: 3,
    formatHoursFn: value => `${value}h`,
    formatMoneyFn: value => value,
    toNumber: Number
  });

  assert.equal(meta.hours, 6);
  assert.equal(meta.payout, 450);
  assert.equal(meta.availableIn, 2);
  assert.equal(meta.expiresIn, 6);
  assert.equal(meta.completionMode, 'manual');
  assert.equal(meta.progressLabel, 'Deliver reports');
  assert.ok(meta.summary.includes('Opens in 2 days'));
  assert.ok(meta.summary.includes('6h focus'));
  assert.ok(meta.summary.includes('$450 on completion'));
  assert.ok(meta.summary.includes('Manual completion'));
  assert.ok(meta.summary.includes('Expires in 6 days'));
});
