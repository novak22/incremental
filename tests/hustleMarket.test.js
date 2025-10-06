import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { completeActionInstance, advanceActionInstance } = await import('../src/game/actions/progress/instances.js');
const {
  ensureHustleMarketState,
  normalizeHustleMarketOffer,
  normalizeAcceptedOffer
} = await import('../src/core/state/slices/hustleMarket/index.js');
const actionMarketModule = await import('../src/core/state/slices/actionMarket/index.js');
const {
  ensureActionMarketCategoryState,
  getActionMarketAvailableOffers,
  claimActionMarketOffer,
  getActionMarketClaimedOffers,
  normalizeActionMarketOffer
} = actionMarketModule;
const { hustlesModule, stateModule } = harness;
const {
  rollDailyOffers,
  getAvailableOffers,
  getClaimedOffers,
  acceptHustleOffer,
  releaseClaimedHustleOffer,
  HUSTLE_TEMPLATES,
  describeHustleRequirements,
  getMarketRollAuditLog: hustlesAuditLog
} = hustlesModule;
const { getState, getActionState } = stateModule;
const {
  resolveOfferHours,
  resolveOfferPayoutAmount,
  resolveOfferPayoutSchedule
} = await import('../src/game/hustles/offerUtils.js');
const { buildVariantPool, selectVariantFromPool } = await import('../src/game/hustles/market/variantSelection.js');
const { buildOfferMetadata, createOfferFromVariant } = await import('../src/game/hustles/market/offerLifecycle.js');
const { getMarketRollAuditLog: directAuditLog } = await import('../src/game/hustles/market.js');

test.beforeEach(() => {
  harness.resetState();
});

function findEligibleTemplate(state) {
  return HUSTLE_TEMPLATES.find(template => {
    const descriptors = describeHustleRequirements(template, state) || [];
    return descriptors.every(entry => entry?.met !== false);
  }) || HUSTLE_TEMPLATES[0];
}

test('normalizeHustleMarketOffer clamps the active window and fills defaults', () => {
  const normalized = normalizeHustleMarketOffer({
    templateId: 'writing-course',
    rolledOnDay: -4,
    availableOnDay: 0,
    expiresOnDay: -2,
    seats: 0,
    metadata: { payout: { amount: 150 } }
  }, { fallbackDay: 3, fallbackTimestamp: 0 });

  assert.ok(normalized, 'expected normalization to produce an offer payload');
  assert.equal(normalized.templateId, 'writing-course');
  assert.equal(normalized.availableOnDay, 3, 'available day should clamp to the fallback day');
  assert.equal(normalized.expiresOnDay, 3, 'expiration should not precede availability');
  assert.equal(normalized.rolledOnDay, 3, 'rolled day should clamp within the active window');
  assert.equal(normalized.seats, 1, 'seats should default to at least one');
  assert.match(normalized.id, /^market-writing-course-3-/);
  assert.deepEqual(normalized.daysActive, [3]);
});

test('normalizeAcceptedOffer enforces payout defaults and clamps deadlines', () => {
  const metadata = { notes: 'remember to invoice' };
  const normalized = normalizeAcceptedOffer({
    offerId: 'offer-normalize-test',
    templateId: 'writing-course',
    acceptedOnDay: -2,
    deadlineDay: -5,
    hoursRequired: -3,
    payout: { amount: -50 },
    seats: 0,
    metadata
  }, { fallbackDay: 4 });

  assert.ok(normalized, 'accepted entry should normalize successfully');
  assert.equal(normalized.acceptedOnDay, 4, 'accepted day should clamp to the fallback');
  assert.equal(normalized.deadlineDay, 4, 'deadline cannot precede the accepted day');
  assert.equal(normalized.hoursRequired, 0, 'hours should clamp to a non-negative value');
  assert.equal(normalized.seats, 1, 'seat count should floor at one');
  assert.equal(normalized.payout.amount, 0, 'payout amounts should clamp to zero or higher');
  assert.equal(normalized.payout.schedule, 'onCompletion', 'missing payout schedule should default to onCompletion');
  assert.notStrictEqual(normalized.metadata, metadata, 'metadata should be cloned');
  assert.deepEqual(normalized.metadata, metadata, 'cloned metadata should preserve the original values');
});

test('HUSTLE_TEMPLATES includes study courses with market metadata', () => {
  const studyEntries = HUSTLE_TEMPLATES.filter(template => template?.tag?.type === 'study');
  assert.ok(studyEntries.length > 0, 'expected study templates in market pool');
  studyEntries.forEach(template => {
    assert.ok(template.market, 'study template should expose market metadata');
    assert.ok(Array.isArray(template.market.variants) && template.market.variants.length > 0,
      'study template should define at least one market variant');
  });
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

test('variant selection normalizes pools and respects configured weights', () => {
  const template = {
    id: 'weighted-template',
    name: 'Weighted Template',
    market: {
      seats: 2,
      variants: [
        { id: 'light', weight: 1, metadata: { payout: { amount: 50 } } },
        { id: 'heavy', weight: 9, copies: 2, seats: 3, metadata: { requirements: { hours: 6 } } }
      ]
    }
  };

  const pool = buildVariantPool(template);
  assert.equal(pool.length, 2, 'expected two normalized variants');
  const [lightVariant, heavyVariant] = pool;
  assert.equal(lightVariant.availableAfterDays, 0, 'fallback variant should default to immediate availability');
  assert.equal(heavyVariant.seats, 3, 'variant-specific seat overrides should persist');
  assert.equal(heavyVariant.copies, 2, 'variant copies should be preserved');

  const selected = selectVariantFromPool(pool, () => 0.95);
  assert.equal(selected.id, 'heavy', 'weighted selection should choose the heavier entry at high rolls');
});

test('offer lifecycle composes metadata and creates normalized offers', () => {
  const template = {
    id: 'metadata-template',
    name: 'Metadata Template',
    market: {
      seats: 1,
      metadata: {
        requirements: { hours: 4 },
        payout: { amount: 100, schedule: 'onCompletion' },
        progress: { hoursPerDay: 2 }
      }
    }
  };

  const variant = {
    id: 'metadata-variant',
    definitionId: 'metadata-template',
    availableAfterDays: 1,
    durationDays: 3,
    seats: 2,
    metadata: {
      requirements: { hours: 6 },
      payout: { amount: 180, schedule: 'afterParty' },
      progress: { daysRequired: 4 },
      hoursPerDay: 3,
      progressLabel: 'Daily check-ins'
    }
  };

  const metadata = buildOfferMetadata(template, variant);
  assert.equal(metadata.requirements.hours, 6, 'variant requirements should override template defaults');
  assert.equal(metadata.payout.amount, 180, 'variant payout amount should override template defaults');
  assert.equal(metadata.payout.schedule, 'afterParty', 'variant payout schedule should override template defaults');
  assert.equal(metadata.progress.daysRequired, 4, 'progress overrides should be merged into metadata');
  assert.equal(metadata.hoursPerDay, 3, 'metadata hoursPerDay should reflect the resolved value');

  const offer = createOfferFromVariant({ template, variant, day: 5, timestamp: 1111 });
  assert.equal(offer.availableOnDay, 6, 'available day should respect variant offsets');
  assert.equal(offer.expiresOnDay, 9, 'expiry day should respect variant durations');
  assert.equal(offer.seats, 2, 'offer seats should inherit variant overrides');
  assert.equal(offer.metadata.hoursRequired, 6, 'normalized offer metadata should expose resolved hours');
  assert.equal(offer.metadata.payoutAmount, 180, 'normalized offer metadata should expose payout amount');
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

test('offers and accepted entries derive contract fields from shared helpers', () => {
  const baseState = harness.resetState();
  baseState.day = 10;

  const template = HUSTLE_TEMPLATES.find(entry => entry?.id === 'freelance') || HUSTLE_TEMPLATES[0];
  assert.ok(template, 'expected a freelance template to validate contract helpers');

  const rngValues = [0, 0.45, 0.9];
  let selectedOffer = null;
  let selectedState = null;
  for (const value of rngValues) {
    const attemptState = harness.resetState();
    attemptState.day = baseState.day;
    const offers = rollDailyOffers({ templates: [template], day: attemptState.day, now: 1000 + Math.floor(value * 100), state: attemptState, rng: () => value });
    const variantOffer = offers.find(entry => entry.variantId && entry.variantId !== 'freelance-rush');
    if (variantOffer) {
      selectedOffer = variantOffer;
      selectedState = attemptState;
      break;
    }
  }

  assert.ok(selectedOffer, 'expected to find a variant offer for helper validation');
  assert.ok(selectedState, 'helper validation requires a state with the selected offer');

  const expectedHours = resolveOfferHours(selectedOffer, template);
  if (expectedHours != null) {
    assert.equal(selectedOffer.metadata.requirements.hours, expectedHours);
    assert.equal(selectedOffer.metadata.hoursRequired, expectedHours);
  }

  const expectedPayoutAmount = resolveOfferPayoutAmount(selectedOffer, template);
  if (expectedPayoutAmount != null) {
    assert.equal(Math.round(Number(selectedOffer.metadata.payout.amount) || 0), Math.round(expectedPayoutAmount));
    assert.equal(Math.round(Number(selectedOffer.metadata.payoutAmount) || 0), Math.round(expectedPayoutAmount));
  }

  const expectedSchedule = resolveOfferPayoutSchedule(selectedOffer);
  assert.equal(selectedOffer.metadata.payout.schedule, expectedSchedule);
  assert.equal(selectedOffer.metadata.payoutSchedule, expectedSchedule);

  const accepted = acceptHustleOffer(selectedOffer.id, { state: selectedState });
  assert.ok(accepted, 'expected the selected offer to be accepted');

  if (expectedHours != null) {
    assert.equal(accepted.hoursRequired, expectedHours);
  }
  if (expectedPayoutAmount != null) {
    assert.equal(Math.round(Number(accepted.payout?.amount) || 0), Math.round(expectedPayoutAmount));
  }
  assert.equal(accepted.payout?.schedule, expectedSchedule);
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
  const claimedVisible = availableOffers.some(entry => entry.id === offer.id);
  assert.equal(claimedVisible, false, 'claimed offers should be excluded from availability by default');

  const actionState = getActionState(offer.definitionId, state);
  assert.ok(actionState.instances.length > 0, 'acceptance should create an action instance');
  assert.equal(actionState.instances[0].id, accepted.instanceId);
});

test('paid knowledge track seats stay capped while enrollment is active', () => {
  const state = harness.resetState();
  state.day = 12;
  state.money = 10_000;

  const paidKnowledgeTemplate = HUSTLE_TEMPLATES.find(template => {
    if (!template || template.tag?.type !== 'study') return false;
    const tuition = Number(template?.market?.metadata?.tuitionCost ?? 0);
    return Number.isFinite(tuition) && tuition > 0;
  });

  assert.ok(paidKnowledgeTemplate, 'expected a paid knowledge track template in the catalog');

  const initialRoll = rollDailyOffers({
    templates: [paidKnowledgeTemplate],
    day: state.day,
    now: 1000,
    state,
    rng: () => 0
  });

  const initialOffers = initialRoll.filter(offer => offer.templateId === paidKnowledgeTemplate.id);
  assert.ok(initialOffers.length > 0, 'expected an initial knowledge seat to appear');
  const [initialSeat] = initialOffers;
  assert.equal(initialSeat.claimed, false, 'initial seat should be available for enrollment');

  const accepted = acceptHustleOffer(initialSeat.id, { state });
  assert.ok(accepted, 'enrollment should succeed when tuition is available');

  const claimedEntries = getClaimedOffers(state, { day: state.day });
  assert.ok(claimedEntries.find(entry => entry.offerId === initialSeat.id),
    'claimed seat should be tracked in market state');

  state.day += 1;
  const followUpRoll = rollDailyOffers({
    templates: [paidKnowledgeTemplate],
    day: state.day,
    now: 2000,
    state,
    rng: () => 0
  });

  const dayTwoSeats = followUpRoll.filter(offer => offer.templateId === paidKnowledgeTemplate.id);
  assert.equal(dayTwoSeats.length, 1, 'claimed seat should block new seats from spawning the next day');
  assert.equal(dayTwoSeats[0].id, initialSeat.id, 'existing enrollment seat should persist across rolls');
  assert.equal(dayTwoSeats[0].claimed, true, 'seat should remain claimed until released');

  const released = releaseClaimedHustleOffer({ offerId: initialSeat.id }, { state });
  assert.ok(released, 'release call should succeed to free the seat');

  state.day += 1;
  const postReleaseRoll = rollDailyOffers({
    templates: [paidKnowledgeTemplate],
    day: state.day,
    now: 3000,
    state,
    rng: () => 0
  });

  const reopenedSeats = postReleaseRoll.filter(offer => offer.templateId === paidKnowledgeTemplate.id);
  assert.ok(reopenedSeats.some(offer => offer.claimed !== true),
    'seat should become available again after the enrollment is released');
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

test('acceptHustleOffer enforces daily limits across multiple pending offers', () => {
  const state = harness.resetState();
  state.day = 9;
  state.timeLeft = 48;
  state.money = 10_000;

  const template = HUSTLE_TEMPLATES.find(entry => entry?.id === 'surveySprint' && Number(entry.dailyLimit) > 1);
  assert.ok(template, 'expected survey sprint template with a daily limit');

  const dailyLimit = Number(template.dailyLimit);
  assert.ok(Number.isFinite(dailyLimit) && dailyLimit > 1, 'survey sprint should advertise multiple daily runs');

  rollDailyOffers({ templates: [template], day: state.day, now: 10_000, state, rng: () => 0 });

  function acceptNextOffer() {
    let available = getAvailableOffers(state, { day: state.day });
    let offer = available.find(entry => entry.templateId === template.id);
    if (!offer) {
      rollDailyOffers({ templates: [template], day: state.day, now: Date.now(), state, rng: () => 0 });
      available = getAvailableOffers(state, { day: state.day });
      offer = available.find(entry => entry.templateId === template.id);
    }
    return offer ? acceptHustleOffer(offer.id, { state }) : null;
  }

  const acceptedEntries = [];
  for (let index = 0; index < dailyLimit; index += 1) {
    const accepted = acceptNextOffer();
    assert.ok(accepted, `expected acceptance ${index + 1} to succeed before hitting the cap`);
    acceptedEntries.push(accepted);
  }

  const usageSnapshot = template.getDailyUsage(state);
  assert.equal(usageSnapshot.pending, dailyLimit, 'pending reservations should match the daily limit');
  assert.equal(usageSnapshot.remaining, 0, 'no remaining slots should be available after reserving the limit');

  const blockedAttempt = acceptNextOffer();
  assert.equal(blockedAttempt, null, 'acceptance should fail once the daily limit is reserved');
  const disabledReason = template.getDisabledReason(state);
  assert.match(disabledReason, /claimed/i, 'blocked attempt should describe the claimed daily slots');

  const released = releaseClaimedHustleOffer({ offerId: acceptedEntries[0].offerId }, { state });
  assert.ok(released, 'expected release call to free a reserved slot');

  const postReleaseUsage = template.getDailyUsage(state);
  assert.equal(postReleaseUsage.pending, dailyLimit - 1, 'releasing should lower the pending reservation count');
  assert.equal(postReleaseUsage.remaining, 1, 'one slot should reopen after releasing a claim');

  const resumedAcceptance = acceptNextOffer();
  assert.ok(resumedAcceptance, 'acceptance should succeed again after freeing capacity');
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

test('audit log debug helpers expose the latest roll summary', () => {
  const state = harness.resetState();
  state.day = 7;

  const template = {
    id: 'audit-hustle',
    name: 'Audit Hustle',
    market: {
      variants: [{ id: 'audit-variant', copies: 1 }]
    }
  };

  const before = directAuditLog();
  const offers = rollDailyOffers({ templates: [template], day: state.day, now: 777, state, rng: () => 0 });
  assert.ok(Array.isArray(offers) && offers.length > 0, 'expected offers to be rolled for audit validation');

  const debugNamespace = globalThis.__HUSTLE_MARKET_DEBUG__;
  assert.ok(debugNamespace, 'debug namespace should be attached to the global scope');
  assert.equal(typeof debugNamespace.getAuditLog, 'function', 'debug namespace should expose getAuditLog');

  const auditEntries = debugNamespace.getAuditLog();
  assert.ok(Array.isArray(auditEntries) && auditEntries.length >= before.length, 'audit log should grow after a new roll');
  const latest = auditEntries[auditEntries.length - 1];
  assert.equal(latest.day, state.day, 'latest audit entry should match the rolled day');

  const printedOffers = debugNamespace.printOffers();
  assert.ok(Array.isArray(printedOffers), 'printOffers should return an array of offers');

  const moduleAudit = hustlesAuditLog();
  assert.ok(moduleAudit.length > 0, 'module export should yield audit entries');
  assert.equal(moduleAudit[moduleAudit.length - 1].day, state.day, 'module export should mirror the latest audit entry');
});

test('availability selectors can include claimed offers when requested', () => {
  const state = getState();
  state.day = 6;

  const template = findEligibleTemplate(state);

  const [offer] = rollDailyOffers({ templates: [template], day: 6, now: 100, state, rng: () => 0 });
  acceptHustleOffer(offer.id, { state });

  const availableDefault = getAvailableOffers(state, { day: 6 });
  assert.equal(
    availableDefault.some(entry => entry.id === offer.id),
    false,
    'claimed offer should be hidden by default'
  );

  const availableWithClaimed = getAvailableOffers(state, { day: 6, includeClaimed: true });
  assert.equal(
    availableWithClaimed.some(entry => entry.id === offer.id),
    true,
    'claimed offer should appear when explicitly requested'
  );
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
  assert.ok(reroll.length >= 1, 'reroll should produce fresh offers after expiry');
  assert.equal(
    reroll.some(entry => entry.id === offer.id),
    false,
    'expired offer should be removed from the market'
  );
  assert.equal(
    reroll.every(entry => entry.rolledOnDay === state.day || entry.expiresOnDay >= state.day),
    true,
    'reroll should only include active offers after expiry'
  );

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

test('multi-day hustle variants award their full contract payout on completion', () => {
  const state = getState();
  state.day = 5;

  const template = HUSTLE_TEMPLATES.find(entry => entry?.id === 'freelance') || HUSTLE_TEMPLATES[0];
  assert.ok(template, 'expected a freelance hustle template for multi-day payout validation');

  const variantDefinition = template.market?.variants?.find(variant => variant?.id === 'freelance-series');
  assert.ok(variantDefinition, 'freelance template should expose the multi-day series variant');
  const expectedPayout = Math.round(Number(variantDefinition.metadata?.payoutAmount) || 0);
  assert.ok(expectedPayout > 0, 'variant payout amount should be positive');

  const offers = rollDailyOffers({ templates: [template], day: state.day, now: 500, state, rng: () => 0.6 });
  const multiDayOffer = offers.find(offer => offer.variantId === 'freelance-series');
  assert.ok(multiDayOffer, 'expected the market roll to produce the multi-day variant offer');
  assert.equal(
    Math.round(Number(multiDayOffer.metadata?.payoutAmount) || 0),
    expectedPayout,
    'offer metadata should mirror the variant payout amount'
  );

  const accepted = acceptHustleOffer(multiDayOffer.id, { state });
  assert.ok(accepted, 'multi-day offer should be accepted');
  assert.equal(
    Math.round(Number(accepted.payout?.amount) || 0),
    expectedPayout,
    'accepted entry should carry the full contract payout amount'
  );

  const startingMoney = Number(state.money) || 0;
  const actionState = getActionState(template.id, state);
  const instance = actionState.instances.find(entry => entry.id === accepted.instanceId);
  assert.ok(instance, 'accepted offer should create an action instance');

  const daysRequired = Math.max(1, Number(instance.progress?.daysRequired) || 0);
  const hoursPerDay = (() => {
    const direct = Number(instance.progress?.hoursPerDay);
    if (Number.isFinite(direct) && direct > 0) {
      return direct;
    }
    const metadataHours = Number(accepted.metadata?.progress?.hoursPerDay);
    if (Number.isFinite(metadataHours) && metadataHours > 0) {
      return metadataHours;
    }
    return Number(instance.hoursRequired) / daysRequired;
  })();

  for (let index = 0; index < daysRequired; index += 1) {
    const currentDay = accepted.acceptedOnDay + index;
    state.day = currentDay;
    advanceActionInstance(template, { id: accepted.instanceId }, { state, day: currentDay, hours: hoursPerDay });
  }

  const expectedMoneyTotal = startingMoney + expectedPayout;
  assert.equal(Number(state.money) || 0, expectedMoneyTotal, 'player money should increase by the full contract payout');

  const hustleEntry = state.hustleMarket.accepted.find(entry => entry.instanceId === accepted.instanceId);
  assert.ok(hustleEntry?.payoutPaid, 'accepted entry should mark the payout as granted after completion');
  assert.equal(
    Math.round(Number(hustleEntry.payoutAwarded) || 0),
    expectedPayout,
    'stored payout award should match the multi-day contract amount'
  );
});

test('action market isolates categories and tags entries', () => {
  const state = harness.resetState();
  state.day = 4;

  ensureActionMarketCategoryState(state, 'hustle', { fallbackDay: 4 });
  ensureActionMarketCategoryState(state, 'study', { fallbackDay: 4 });

  const studyTemplate = {
    id: 'study-category-template',
    name: 'Category Study',
    time: 1,
    payout: { amount: 5 },
    market: {
      category: 'study',
      slotsPerRoll: 1,
      variants: [
        {
          id: 'alpha',
          definitionId: 'study-category-template',
          copies: 1,
          availableAfterDays: 0,
          durationDays: 1
        }
      ]
    }
  };

  rollDailyOffers({ templates: [studyTemplate], day: 4, state, rng: () => 0.25, category: 'study' });

  const studyOffers = getActionMarketAvailableOffers(state, 'study', { day: 4, includeUpcoming: false });
  assert.ok(studyOffers.length > 0, 'study market should roll offers');
  assert.ok(studyOffers.every(offer => offer.templateCategory === 'study'), 'study offers should carry their category');

  const hustleOffers = getActionMarketAvailableOffers(state, 'hustle', { day: 4 });
  assert.equal(hustleOffers.length, 0, 'hustle market should remain untouched by study rolls');

  const maintenanceOffer = normalizeActionMarketOffer({
    templateId: 'maintenance-template',
    definitionId: 'maintenance-template',
    variantId: 'standard',
    rolledOnDay: 4,
    rolledAt: Date.now(),
    availableOnDay: 4,
    expiresOnDay: 6,
    templateCategory: 'maintenance',
    metadata: { payout: { amount: 10, schedule: 'onCompletion' } },
    seats: 1
  }, { fallbackDay: 4, category: 'maintenance' });

  const maintenanceMarket = ensureActionMarketCategoryState(state, 'maintenance', { fallbackDay: 4 });
  maintenanceMarket.offers = [maintenanceOffer];
  maintenanceMarket.accepted = [];
  ensureActionMarketCategoryState(state, 'maintenance', { fallbackDay: 4 });

  const accepted = claimActionMarketOffer(state, 'maintenance', maintenanceOffer.id, {
    acceptedOnDay: 4,
    hoursRequired: 3,
    payout: { amount: 10, schedule: 'onCompletion' },
    metadata: { label: 'Maintenance Task' }
  });

  assert.ok(accepted, 'maintenance offer should be claimable');
  assert.equal(accepted.templateCategory, 'maintenance', 'accepted entry should retain its category');

  const maintenanceClaimed = getActionMarketClaimedOffers(state, 'maintenance', { day: 4 });
  assert.equal(maintenanceClaimed.length, 1, 'maintenance category should report accepted entry');

  const hustleClaimed = getActionMarketClaimedOffers(state, 'hustle', { day: 4 });
  assert.equal(hustleClaimed.length, 0, 'hustle category should not be affected');

  assert.strictEqual(state.hustleMarket, state.actionMarket.categories.hustle, 'hustle alias should point to category slice');
});
