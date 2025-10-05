import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { completeActionInstance, advanceActionInstance } = await import('../src/game/actions/progress.js');
const { ensureHustleMarketState } = await import('../src/core/state/slices/hustleMarket.js');
const { hustlesModule, stateModule } = harness;
const {
  rollDailyOffers,
  getAvailableOffers,
  getClaimedOffers,
  acceptHustleOffer,
  HUSTLE_TEMPLATES,
  describeHustleRequirements
} = hustlesModule;
const { getState, getActionState } = stateModule;

test.beforeEach(() => {
  harness.resetState();
});

function findEligibleTemplate(state) {
  return HUSTLE_TEMPLATES.find(template => {
    const descriptors = describeHustleRequirements(template, state) || [];
    return descriptors.every(entry => entry?.met !== false);
  }) || HUSTLE_TEMPLATES[0];
}

test('HUSTLE_TEMPLATES includes only market-ready hustles', () => {
  const hasStudyEntries = HUSTLE_TEMPLATES.some(template => template?.tag?.type === 'study');
  assert.equal(hasStudyEntries, false, 'market templates should exclude study actions');
});

test('ensureDailyOffersForDay seeds bootstrap offers per template and avoids duplicate rolls', () => {
  const state = harness.resetState();
  state.day = 5;
  state.hustleMarket.offers = [];
  state.hustleMarket.lastRolledOnDay = 0;

  const templates = [
    {
      id: 'double-slot',
      name: 'Double Slot Gig',
      time: 2,
      payout: { amount: 40 },
      market: {
        slotsPerRoll: 2,
        maxActive: 3,
        variants: [
          { id: 'alpha', copies: 1, maxActive: 2 },
          { id: 'beta', copies: 1, maxActive: 2 }
        ]
      }
    },
    {
      id: 'single-slot',
      name: 'Single Slot Gig',
      time: 3,
      payout: { amount: 60 },
      market: {
        slotsPerRoll: 1,
        maxActive: 1,
        variants: [{ id: 'solo', copies: 1 }]
      }
    }
  ];

  const offers = hustlesModule.ensureDailyOffersForDay({
    state,
    templates,
    day: state.day,
    now: 1000,
    rng: () => 0
  });

  const countByTemplate = offers.reduce((acc, offer) => {
    acc.set(offer.templateId, (acc.get(offer.templateId) || 0) + 1);
    return acc;
  }, new Map());

  assert.ok(countByTemplate.get('double-slot') >= 1, 'expected at least one offer for the double-slot template');
  assert.ok(countByTemplate.get('single-slot') >= 1, 'expected at least one offer for the single-slot template');
  assert.equal(state.hustleMarket.lastRolledOnDay, 5, 'bootstrap roll should track the current day');

  const secondPass = hustlesModule.ensureDailyOffersForDay({
    state,
    templates,
    day: state.day,
    now: 2000,
    rng: () => 0
  });

  assert.equal(secondPass.length, offers.length, 'repeat bootstrap on the same day should not add new offers');
  assert.equal(state.hustleMarket.lastRolledOnDay, 5, 'duplicate rolls should not advance the recorded day');
});

test('ensureDailyOffersForDay rerolls preserve windows, durations, and capacity limits', () => {
  const state = harness.resetState();
  state.day = 1;
  state.hustleMarket.offers = [];
  state.hustleMarket.lastRolledOnDay = 0;

  const templates = [
    {
      id: 'windowed',
      name: 'Windowed Contract',
      time: 4,
      payout: { amount: 120 },
      market: {
        slotsPerRoll: 2,
        maxActive: 2,
        variants: [
          {
            id: 'today',
            durationDays: 2,
            maxActive: 1,
            metadata: { payout: { amount: 120, schedule: 'onCompletion' } }
          },
          {
            id: 'tomorrow',
            availableAfterDays: 1,
            durationDays: 2,
            maxActive: 1,
            metadata: { payout: { amount: 120, schedule: 'onCompletion' } }
          }
        ]
      }
    }
  ];

  const firstRoll = hustlesModule.ensureDailyOffersForDay({
    state,
    templates,
    day: state.day,
    now: 500,
    rng: () => 0
  });

  assert.equal(firstRoll.length, 2, 'initial roll should fill both slots');
  const todayOffer = firstRoll.find(offer => offer.variantId === 'today');
  const tomorrowOffer = firstRoll.find(offer => offer.variantId === 'tomorrow');
  assert.ok(todayOffer, 'expected today variant to spawn');
  assert.ok(tomorrowOffer, 'expected tomorrow variant to spawn');
  assert.equal(todayOffer.availableOnDay, 1);
  assert.equal(
    todayOffer.expiresOnDay - todayOffer.availableOnDay,
    2,
    'duration should match the variant window span'
  );
  assert.equal(tomorrowOffer.availableOnDay, 2, 'tomorrow variant should unlock the next day');
  assert.equal(state.hustleMarket.offers.length, 2);

  state.day = 2;
  const secondRoll = hustlesModule.ensureDailyOffersForDay({
    state,
    templates,
    day: state.day,
    now: 1500,
    rng: () => 0
  });

  assert.equal(state.hustleMarket.lastRolledOnDay, 2, 'daily reroll should update the recorded day');
  assert.equal(secondRoll.length, 2, 'reroll should respect maxActive cap');
  const preservedToday = secondRoll.filter(offer => offer.variantId === 'today');
  assert.equal(preservedToday.length, 1, 'active variant should persist across the reroll');
  assert.ok(secondRoll.some(offer => offer.variantId === 'tomorrow' && offer.availableOnDay === 2));
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

test('rollDailyOffers respects slotsPerRoll, variant copies, and maxActive', () => {
  const state = getState();
  state.day = 12;

  const template = {
    id: 'multi-slot',
    name: 'Multi Slot Hustle',
    time: 6,
    market: {
      slotsPerRoll: 3,
      maxActive: 5,
      variants: [
        {
          id: 'batch',
          durationDays: 2,
          copies: 3,
          maxActive: 5,
          metadata: {
            requirements: { hours: 6 },
            payout: { amount: 240, schedule: 'onCompletion' }
          }
        }
      ]
    }
  };

  const firstRoll = rollDailyOffers({ templates: [template], day: 12, now: 400, state, rng: () => 0.1 });
  assert.equal(firstRoll.length, 3, 'first roll should respect slotsPerRoll and variant copies');
  assert.ok(firstRoll.every(offer => offer.variantId === 'batch'), 'all offers should share the configured variant');
  const firstIds = new Set(firstRoll.map(offer => offer.id));
  assert.equal(firstIds.size, 3, 'each rolled offer should receive a unique id');

  state.day = 13;
  const secondRoll = rollDailyOffers({ templates: [template], day: 13, now: 500, state, rng: () => 0.2 });
  assert.equal(secondRoll.length, 5, 'second roll should fill remaining capacity up to maxActive');
  const secondIds = new Set(secondRoll.map(offer => offer.id));
  assert.equal(secondIds.size, 5, 'no duplicate ids should appear after rerolling');
  const rolledOnSecondDay = secondRoll.filter(offer => offer.rolledOnDay === 13);
  assert.equal(rolledOnSecondDay.length, 2, 'remaining capacity should be consumed by new offers');

  const ensured = ensureHustleMarketState(state, { fallbackDay: state.day });
  assert.equal(ensured.offers.length, 5, 'state normalization should keep all repeated variant offers');
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

test('acceptHustleOffer rejects offers when requirements are not met', () => {
  const state = getState();
  state.day = 6;
  const template = HUSTLE_TEMPLATES.find(entry => Array.isArray(entry?.requirements) && entry.requirements.length);
  assert.ok(template, 'expected a template with explicit requirements');

  const [offer] = rollDailyOffers({ templates: [template], day: state.day, now: 800, state, rng: () => 0 });
  assert.ok(offer, 'expected a rolled offer for requirement gating');

  const attempt = acceptHustleOffer(offer.id, { state });
  assert.equal(attempt, null, 'unmet requirements should block acceptance');

  const claimedOffers = getClaimedOffers(state, { day: state.day });
  assert.equal(claimedOffers.length, 0, 'offer should remain unclaimed when requirements fail');

  const availableOffers = getAvailableOffers(state, { day: state.day });
  const stillAvailable = availableOffers.some(entry => entry.id === offer.id);
  assert.equal(stillAvailable, true, 'offer should remain in the market for later attempts');
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

  const template = findEligibleTemplate(state);

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

  const template = findEligibleTemplate(state);

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

test('multi-offer templates prune expired entries and refresh capacity', () => {
  const state = getState();
  state.day = 21;

  const template = {
    id: 'multi-expiring',
    name: 'Batch Delivery',
    time: 5,
    market: {
      slotsPerRoll: 2,
      maxActive: 4,
      variants: [
        {
          id: 'daily',
          durationDays: 1,
          copies: 2,
          maxActive: 4,
          metadata: {
            requirements: { hours: 5 },
            payout: { amount: 200, schedule: 'onCompletion' }
          }
        }
      ]
    }
  };

  const firstRoll = rollDailyOffers({ templates: [template], day: 21, now: 900, state, rng: () => 0 });
  assert.equal(firstRoll.length, 2, 'initial roll should populate two offers');
  const expiryDay = Math.max(...firstRoll.map(offer => offer.expiresOnDay));

  state.day = expiryDay + 1;
  const reroll = rollDailyOffers({ templates: [template], day: state.day, now: 950, state, rng: () => 0 });
  assert.equal(reroll.length, 2, 'expired offers should be replaced after their window closes');
  assert.ok(reroll.every(offer => offer.rolledOnDay === state.day), 'replacement offers should reflect the new roll day');
  const rerollIds = new Set(reroll.map(offer => offer.id));
  assert.equal(rerollIds.size, 2, 'replacement offers should maintain unique ids');
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

test('on-completion hustle payouts award money after logging required hours', () => {
  const state = getState();
  state.day = 7;

  const template = HUSTLE_TEMPLATES[0];
  assert.ok(template, 'expected a hustle template to validate completion payouts');

  const [offer] = rollDailyOffers({ templates: [template], day: state.day, now: 700, state, rng: () => 0 });
  assert.ok(offer, 'expected market roll to yield an offer');

  const accepted = acceptHustleOffer(offer.id, { state });
  assert.ok(accepted, 'expected the market offer to be accepted');
  assert.ok(accepted.instanceId, 'accepted entry should link to an action instance');
  assert.equal(accepted.payout?.schedule, 'onCompletion', 'test expects an onCompletion payout schedule');
  const contractAmount = Math.round(Number(accepted.payout?.amount) || 0);
  assert.ok(contractAmount > 0, 'test requires a positive contract payout');

  const startingMoney = Number(state.money) || 0;

  const requiredHours = Number.isFinite(accepted.hoursRequired)
    ? accepted.hoursRequired
    : Number(template.time) || 0;
  assert.ok(requiredHours > 0, 'expected the contract to require logged hours');

  const result = advanceActionInstance(template, accepted.instanceId, {
    state,
    day: state.day,
    hours: requiredHours
  });
  assert.ok(result?.completed, 'logging required hours should complete the action instance');

  const updatedMoney = Number(state.money) || 0;
  assert.equal(updatedMoney, startingMoney + contractAmount, 'player money should increase by the contract payout');

  const hustleEntry = state.hustleMarket.accepted.find(entry => entry.instanceId === accepted.instanceId);
  assert.ok(hustleEntry?.payoutPaid, 'accepted hustle entry should mark the payout as granted');
  assert.equal(Math.round(Number(hustleEntry.payoutAwarded) || 0), contractAmount, 'stored payout award should match the contract amount');
});
