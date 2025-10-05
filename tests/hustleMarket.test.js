import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { hustlesModule, stateModule } = harness;
const { rollDailyOffers, getAvailableOffers, HUSTLE_TEMPLATES } = hustlesModule;
const { getState } = stateModule;

test.beforeEach(() => {
  harness.resetState();
});

test('rollDailyOffers seeds offers for every template and persists metadata', () => {
  const state = getState();
  state.day = 5;

  const offers = rollDailyOffers({
    templates: HUSTLE_TEMPLATES,
    day: 5,
    now: 123456,
    state,
    rng: () => 0
  });

  assert.ok(offers.length >= HUSTLE_TEMPLATES.length, 'should produce at least one offer per template');
  const templatesCovered = new Set();

  for (const offer of offers) {
    templatesCovered.add(offer.templateId);
    assert.equal(offer.availableOnDay, 5, 'new offers should be available immediately by default');
    assert.ok(offer.expiresOnDay >= offer.availableOnDay, 'offers should not expire before they begin');
  }

  assert.equal(templatesCovered.size, HUSTLE_TEMPLATES.length, 'every template should receive an offer on the first roll');
  assert.equal(state.hustleMarket.offers.length, offers.length, 'state should persist the rolled offers');
  assert.equal(state.hustleMarket.lastRolledOnDay, 5);
  assert.equal(state.hustleMarket.lastRolledAt, 123456);
});

test('rollDailyOffers rerolls templates when prior offers expire', () => {
  const state = getState();
  const templates = HUSTLE_TEMPLATES.slice(0, 2);
  assert.equal(templates.length, 2, 'expected at least two templates for reroll coverage');

  const firstRoll = rollDailyOffers({ templates, day: 2, now: 1000, state, rng: () => 0 });
  assert.equal(firstRoll.length, templates.length);

  const expiringTemplateId = firstRoll[0].templateId;
  const preservedTemplateId = firstRoll[1].templateId;

  state.hustleMarket.offers = state.hustleMarket.offers.map(offer => {
    if (offer.templateId === expiringTemplateId) {
      return { ...offer, expiresOnDay: 2 };
    }
    if (offer.templateId === preservedTemplateId) {
      return { ...offer, expiresOnDay: 5 };
    }
    return offer;
  });

  const secondRoll = rollDailyOffers({ templates, day: 3, now: 2000, state, rng: () => 0 });
  const rerolledOffers = secondRoll.filter(offer => offer.templateId === expiringTemplateId);
  const preservedOffer = secondRoll.find(offer => offer.templateId === preservedTemplateId);
  const originalPreserved = firstRoll.find(offer => offer.templateId === preservedTemplateId);

  assert.ok(rerolledOffers.some(offer => offer.availableOnDay === 3), 'expired template should receive a fresh offer');
  assert.equal(preservedOffer.id, originalPreserved.id, 'non-expired offers should remain intact');
});

test('getAvailableOffers respects availability windows and upcoming flag', () => {
  const state = getState();
  state.day = 10;

  const customTemplate = {
    id: 'custom-hustle',
    name: 'Custom Hustle',
    description: 'Test hustle with delayed availability.',
    market: {
      variants: [
        {
          id: 'weekend',
          availableAfterDays: 1,
          durationDays: 1,
          metadata: { theme: 'weekend' }
        }
      ]
    }
  };

  const offers = rollDailyOffers({ templates: [customTemplate], day: 10, now: 5000, state, rng: () => 0 });
  assert.equal(offers.length, 1);
  const [offer] = offers;
  assert.equal(offer.availableOnDay, 11, 'offer should start one day after the roll');
  assert.equal(offer.expiresOnDay, 12, 'duration should extend the offer window');

  const availableDay10 = getAvailableOffers(state, { day: 10 });
  assert.equal(availableDay10.length, 0, 'offer should not be available before its start day');

  const availableDay11 = getAvailableOffers(state, { day: 11 });
  assert.equal(availableDay11.length, 1, 'offer should appear once its availability window opens');

  const upcoming = getAvailableOffers(state, { day: 10, includeUpcoming: true });
  assert.equal(upcoming.length, 1, 'upcoming flag should include future offers');
});

