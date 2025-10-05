import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { completeActionInstance } = await import('../src/game/actions/progress.js');
const { hustlesModule, stateModule } = harness;
const {
  rollDailyOffers,
  getAvailableOffers,
  getClaimedOffers,
  acceptHustleOffer,
  HUSTLE_TEMPLATES
} = hustlesModule;
const { getState, getActionState } = stateModule;

test.beforeEach(() => {
  harness.resetState();
});

test('HUSTLE_TEMPLATES includes only market-ready hustles', () => {
  const hasStudyEntries = HUSTLE_TEMPLATES.some(template => template?.tag?.type === 'study');
  assert.equal(hasStudyEntries, false, 'market templates should exclude study actions');
});

test('rollDailyOffers builds variant metadata and allows multiple variants', () => {
  const state = getState();
  state.day = 8;

  const template = {
    id: 'multi-variant',
    name: 'Multi Variant Hustle',
    time: 4,
    payout: { amount: 120 },
    market: {
      variants: [
        {
          id: 'weekday',
          durationDays: 2,
          metadata: {
            requirements: { hours: 4 },
            payout: { amount: 120, schedule: 'onCompletion' }
          }
        },
        {
          id: 'weekend',
          durationDays: 3,
          metadata: {
            requirements: { hours: 6 },
            payout: { amount: 180, schedule: 'weekend' }
          }
        }
      ]
    }
  };

  const firstRoll = rollDailyOffers({ templates: [template], day: 8, now: 1000, state, rng: () => 0 });
  assert.equal(firstRoll.length, 1);
  const [weekdayOffer] = firstRoll;
  assert.equal(weekdayOffer.variantId, 'weekday');
  assert.equal(weekdayOffer.availableOnDay, 8);
  assert.equal(weekdayOffer.metadata.requirements.hours, 4);
  assert.equal(weekdayOffer.metadata.payout.amount, 120);
  assert.equal(weekdayOffer.metadata.payout.schedule, 'onCompletion');

  state.day = 9;
  const secondRoll = rollDailyOffers({ templates: [template], day: 9, now: 2000, state, rng: () => 0.9 });
  assert.equal(secondRoll.length, 2, 'should preserve first variant and add a second');
  const weekendOffer = secondRoll.find(offer => offer.variantId === 'weekend');
  assert.ok(weekendOffer, 'expected weekend variant to coexist');
  assert.equal(weekendOffer.metadata.requirements.hours, 6);
  assert.equal(weekendOffer.metadata.payout.amount, 180);
  assert.equal(weekendOffer.metadata.payout.schedule, 'weekend');
});

test('acceptHustleOffer claims offers and records accepted state', () => {
  const state = getState();
  state.day = 4;
  const template = HUSTLE_TEMPLATES[0];
  assert.ok(template, 'expected at least one hustle template');

  const [offer] = rollDailyOffers({ templates: [template], day: 4, now: 500, state, rng: () => 0 });
  assert.ok(offer, 'expected an offer to be rolled');

  const accepted = acceptHustleOffer(offer.id, { state });
  assert.ok(accepted, 'acceptance should return an accepted entry');
  assert.equal(accepted.offerId, offer.id);
  assert.equal(accepted.acceptedOnDay, 4);
  assert.equal(accepted.deadlineDay, offer.expiresOnDay);
  assert.equal(accepted.payout.schedule, 'onCompletion');
  assert.ok(accepted.hoursRequired >= 0, 'accepted entry should track required hours');

  const claimedOffers = getClaimedOffers(state, { day: 4 });
  assert.equal(claimedOffers.length, 1, 'claimed selector should include the accepted offer');
  assert.equal(claimedOffers[0].offerId, offer.id);

  const availableOffers = getAvailableOffers(state, { day: 4 });
  assert.equal(availableOffers.length, 0, 'claimed offers should be excluded from availability by default');

  const actionState = getActionState(offer.definitionId, state);
  assert.ok(actionState.instances.length > 0, 'acceptance should create an action instance');
  assert.equal(actionState.instances[0].id, accepted.instanceId);
});

test('acceptHustleOffer seeds progress overrides from metadata', () => {
  const state = getState();
  state.day = 10;

  const baseTemplate = HUSTLE_TEMPLATES[0];
  assert.ok(baseTemplate, 'expected a base hustle template for progress overrides');
  const template = {
    ...baseTemplate,
    market: {
      metadata: {
        requirements: { hours: 12 },
        payout: { amount: 240 }
      },
      variants: [
        {
          id: 'manual-progress',
          durationDays: 5,
          metadata: {
            requirements: { hours: 12 },
            hoursPerDay: 3,
            daysRequired: 4,
            completionMode: 'manual',
            progressLabel: 'Publish daily updates',
            payout: { amount: 240, schedule: 'onCompletion' }
          }
        }
      ]
    }
  };

  const [offer] = rollDailyOffers({ templates: [template], day: state.day, now: 5000, state, rng: () => 0 });
  assert.ok(offer, 'expected an offer for progress override test');
  const storedOffer = state.hustleMarket.offers.find(entry => entry.id === offer.id);
  assert.ok(storedOffer, 'rolled offer should persist in hustle market state');

  const accepted = acceptHustleOffer(storedOffer, { state });
  assert.ok(accepted, 'expected accepted entry for progress override test');

  assert.equal(accepted.metadata.hoursPerDay, 3);
  assert.equal(accepted.metadata.daysRequired, 4);
  assert.equal(accepted.metadata.completionMode, 'manual');
  assert.equal(accepted.metadata.progressLabel, 'Publish daily updates');
  assert.ok(accepted.metadata.progress, 'progress metadata should exist');
  assert.equal(accepted.metadata.progress.hoursPerDay, 3);
  assert.equal(accepted.metadata.progress.daysRequired, 4);
  assert.equal(accepted.metadata.progress.completionMode, 'manual');
  assert.equal(accepted.metadata.progress.label, 'Publish daily updates');

  const actionState = getActionState(template.id, state);
  assert.ok(actionState.instances.length > 0, 'acceptance should create an instance for multi-day offer');
  const instance = actionState.instances[0];
  assert.equal(instance.progress.hoursPerDay, 3);
  assert.equal(instance.progress.daysRequired, 4);
  assert.equal(instance.progress.completion, 'manual');
  assert.equal(instance.progress.completionMode ?? instance.progress.completion, 'manual');
  const progressLabel = instance.progress.label
    ?? accepted.metadata.progress?.label
    ?? accepted.metadata.progressLabel;
  assert.equal(progressLabel, 'Publish daily updates');
});

test('availability selectors can include claimed offers when requested', () => {
  const state = getState();
  state.day = 6;

  const template = HUSTLE_TEMPLATES[1] || HUSTLE_TEMPLATES[0];

  const [offer] = rollDailyOffers({ templates: [template], day: 6, now: 100, state, rng: () => 0 });
  acceptHustleOffer(offer.id, { state });

  const availableDefault = getAvailableOffers(state, { day: 6 });
  assert.equal(availableDefault.length, 0, 'claimed offer should be hidden by default');

  const availableWithClaimed = getAvailableOffers(state, { day: 6, includeClaimed: true });
  assert.equal(availableWithClaimed.length, 1, 'claimed offer should appear when explicitly requested');
  assert.equal(availableWithClaimed[0].id, offer.id);
});

test('expired offers and claims are pruned on reroll', () => {
  const state = getState();
  state.day = 3;

  const template = HUSTLE_TEMPLATES[2] || HUSTLE_TEMPLATES[0];

  const [offer] = rollDailyOffers({ templates: [template], day: 3, now: 10, state, rng: () => 0 });
  const accepted = acceptHustleOffer(offer.id, { state });
  assert.ok(accepted, 'offer should be accepted');

  state.day = accepted.deadlineDay + 2;

  const reroll = rollDailyOffers({ templates: [template], day: state.day, now: 20, state, rng: () => 0 });
  assert.equal(reroll.length, 1, 'reroll should produce a fresh offer after expiry');
  assert.equal(reroll[0].rolledOnDay, state.day);

  const claimedAfterExpiry = getClaimedOffers(state, { day: state.day });
  assert.equal(claimedAfterExpiry.length, 0, 'expired claims should be pruned from selectors');
});

test('completing a hustle hides the accepted entry from pending lists', () => {
  const state = getState();
  state.day = 5;

  const template = HUSTLE_TEMPLATES[0];
  assert.ok(template, 'expected at least one hustle template for completion test');

  const [offer] = rollDailyOffers({ templates: [template], day: state.day, now: 100, state, rng: () => 0 });
  assert.ok(offer, 'expected to roll an offer for completion test');

  const accepted = acceptHustleOffer(offer.id, { state });
  assert.ok(accepted, 'offer should be accepted before completion');

  const claimedBefore = getClaimedOffers(state, { day: state.day });
  assert.equal(claimedBefore.length, 1, 'accepted entry should appear in pending commitments before completion');

  const actionState = getActionState(template.id, state);
  const instance = actionState.instances.find(item => item.id === accepted.instanceId);
  assert.ok(instance, 'completion should resolve the stored action instance');

  const completionHours = Number.isFinite(accepted.hoursRequired)
    ? accepted.hoursRequired
    : Number(instance.hoursRequired) || 0;

  completeActionInstance(template, instance, {
    state,
    completionDay: state.day,
    effectiveTime: completionHours,
    finalPayout: accepted.payout?.amount
  });

  const claimedAfter = getClaimedOffers(state, { day: state.day });
  assert.equal(claimedAfter.length, 0, 'completed entries should no longer appear as pending commitments');

  const completedHistory = getClaimedOffers(state, { day: state.day, includeCompleted: true });
  assert.equal(completedHistory.length, 1, 'completed entry should be accessible when including completed results');
  const [completedEntry] = completedHistory;
  assert.equal(completedEntry.status, 'complete', 'completed entry should carry a complete status flag');
  assert.equal(completedEntry.completedOnDay, state.day, 'completion day should be recorded on the accepted entry');
  if (Number.isFinite(completionHours) && completionHours >= 0) {
    assert.equal(completedEntry.hoursLogged, completionHours, 'hours logged should mirror the completion time');
  }
});
