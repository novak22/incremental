import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAssetOpportunities,
  buildUpgradeOpportunities,
  buildHustleOpportunities,
  buildOpportunitySummary
} from '../../../src/ui/cards/model/finance/opportunities.js';

test('buildAssetOpportunities maps launch readiness', () => {
  const assets = [
    { id: 'alpha', name: 'Alpha', setup: { cost: 100, days: 2, hoursPerDay: 3 } },
    { id: 'beta', name: 'Beta', setup: { cost: 50, days: 1, hoursPerDay: 2 } }
  ];
  const state = {};

  const availability = definition => definition.id === 'beta'
    ? { disabled: true, reasons: ['Need blueprint'] }
    : { disabled: false, reasons: [] };

  const range = definition => ({ min: definition.setup.cost / 5, max: definition.setup.cost / 2 });

  const opportunities = buildAssetOpportunities(assets, state, {
    describeAssetLaunchAvailability: availability,
    getDailyIncomeRange: range
  });

  assert.equal(opportunities[0].id, 'beta', 'sorted by cost ascending');
  assert.equal(opportunities[0].ready, false);
  assert.deepEqual(opportunities[0].reasons, ['Need blueprint']);
  assert.equal(opportunities[1].payoutRange.max, 50);
});

test('buildUpgradeOpportunities surfaces snapshot state', () => {
  const upgrades = [
    { id: 'u1', name: 'Auto', description: 'Automate tasks' },
    { id: 'u2', name: 'Speed' }
  ];
  const snapshots = definition => ({
    cost: definition.id === 'u1' ? 120 : 40,
    ready: definition.id === 'u2',
    purchased: definition.id === 'u1',
    affordable: definition.id === 'u2'
  });

  const opportunities = buildUpgradeOpportunities(upgrades, {}, { getUpgradeSnapshot: snapshots });
  assert.equal(opportunities[0].id, 'u2', 'sorted by cost ascending');
  assert.equal(opportunities[1].purchased, true);
});

test('buildHustleOpportunities prioritises return on time', () => {
  const hustles = [
    { id: 'stream', name: 'Stream', time: 2, payout: { amount: 60 } },
    { id: 'vlog', name: 'Vlog', time: 1, payout: { amount: 20 } }
  ];
  const describeRequirements = definition => [{ label: definition.name, met: definition.id === 'vlog' }];

  const opportunities = buildHustleOpportunities(hustles, {}, { describeHustleRequirements: describeRequirements });
  assert.equal(opportunities[0].id, 'stream', 'higher ROI first');
  assert.equal(opportunities[1].requirements[0].met, true);
});

test('buildOpportunitySummary bundles each lane', () => {
  const summary = buildOpportunitySummary([1], [2], [3]);
  assert.deepEqual(summary, { assets: [1], upgrades: [2], hustles: [3] });
});
