import test from 'node:test';
import assert from 'node:assert/strict';

import { __testables as downworkTestables } from '../../../../../src/ui/views/browser/widgets/downworkWidget.js';

const { buildOfferEntries, sortEntries, getAvailableTime } = downworkTestables;

test('buildOfferEntries returns only unlocked offers that fit available time', () => {
  const state = { timeLeft: 4, day: 3 };

  const offers = [
    { id: 'ready-offer', templateId: 'ready-template', variant: { label: 'Ready Contract' } },
    { id: 'locked-offer', templateId: 'locked-template', variant: { label: 'Locked Contract' } },
    { id: 'long-offer', templateId: 'long-template', variant: { label: 'Long Contract' } },
    { id: 'upcoming-offer', templateId: 'upcoming-template', variant: { label: 'Upcoming Contract' } }
  ];

  const definitions = new Map(
    offers.map(offer => [
      offer.templateId,
      { id: offer.templateId, name: `${offer.variant.label} Definition` }
    ])
  );

  const requirementMap = new Map([
    ['ready-template', []],
    ['locked-template', [{ met: false }]],
    ['long-template', []],
    ['upcoming-template', []]
  ]);

  const metaByOffer = new Map([
    [
      'ready-offer',
      {
        hours: 3,
        payout: 45,
        summary: 'Available now • 3h focus',
        seatSummary: '',
        availableIn: 0
      }
    ],
    [
      'locked-offer',
      {
        hours: 2,
        payout: 30,
        summary: 'Available now • 2h focus',
        seatSummary: '',
        availableIn: 0
      }
    ],
    [
      'long-offer',
      {
        hours: 6,
        payout: 90,
        summary: 'Available now • 6h focus',
        seatSummary: '',
        availableIn: 0
      }
    ],
    [
      'upcoming-offer',
      {
        hours: 2,
        payout: 28,
        summary: 'Opens soon',
        seatSummary: '',
        availableIn: 1
      }
    ]
  ]);

  const entries = buildOfferEntries(state, {
    getOffers: () => offers,
    getDefinition: id => definitions.get(id),
    describeRequirementsFn: definition => requirementMap.get(definition.id) || [],
    describeMeta: ({ offer }) => metaByOffer.get(offer.id)
  });

  assert.equal(entries.length, 1, 'only one offer should be rendered');
  const [entry] = entries;
  assert.equal(entry.id, 'ready-offer');
  assert.equal(entry.hours, 3);
  assert.equal(entry.payout, 45);
  assert.equal(entry.rate, 15);
  assert.equal(entry.hoursLabel, '3h');
  assert.equal(entry.payoutLabel, '$45');
  assert.equal(entry.rateLabel, '$15/h');
  assert.ok(entry.summary.includes('Available now'));
});

test('sortEntries orders offers by the requested metric', () => {
  const sample = [
    { label: 'Alpha', hours: 5, payout: 60, rate: 12 },
    { label: 'Bravo', hours: 2, payout: 40, rate: 20 },
    { label: 'Charlie', hours: 4, payout: 80, rate: 20 }
  ];

  const byRate = sortEntries(sample, 'rate').map(entry => entry.label);
  assert.deepEqual(byRate, ['Charlie', 'Bravo', 'Alpha']);

  const byPayout = sortEntries(sample, 'payout').map(entry => entry.label);
  assert.deepEqual(byPayout, ['Charlie', 'Alpha', 'Bravo']);

  const byTime = sortEntries(sample, 'time').map(entry => entry.label);
  assert.deepEqual(byTime, ['Bravo', 'Charlie', 'Alpha']);
});

test('getAvailableTime never returns negative values', () => {
  assert.equal(getAvailableTime({ timeLeft: -2 }), 0);
  assert.equal(getAvailableTime({ timeLeft: 3.5 }), 3.5);
});
