import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from './helpers/setupDom.js';

ensureTestDom();

const { initializeState } = await import('../src/core/state.js');
const { configureRegistry } = await import('../src/core/state/registry.js');
const { registry } = await import('../src/game/registry.js');
const {
  recordCostContribution,
  recordPayoutContribution,
  recordTimeContribution,
  resetDailyMetrics
} = await import('../src/game/metrics.js');
const { computeDailySummary } = await import('../src/game/summary.js');

test('daily summary aggregates metrics into category totals', () => {
  configureRegistry(registry);
  const state = initializeState();
  resetDailyMetrics(state);

  recordTimeContribution({
    key: 'test:setup',
    label: '🚀 Demo prep',
    hours: 2,
    category: 'setup'
  });
  recordTimeContribution({
    key: 'test:hustle',
    label: '⚡ Freelance burst',
    hours: 3,
    category: 'hustle'
  });
  recordPayoutContribution({
    key: 'test:passive',
    label: '💰 Passive drip',
    amount: 60,
    category: 'passive'
  });
  recordPayoutContribution({
    key: 'test:hustle',
    label: '💼 Hustle cash',
    amount: 24,
    category: 'hustle'
  });
  recordCostContribution({
    key: 'test:upkeep',
    label: '🔧 Tool upkeep',
    amount: 8,
    category: 'maintenance'
  });
  recordCostContribution({
    key: 'test:investment',
    label: '💸 Skill booster',
    amount: 42,
    category: 'investment'
  });

  const summary = computeDailySummary(state);
  assert.equal(summary.totalTime, 5, 'totalTime should combine setup and hustle hours');
  assert.equal(summary.setupHours, 2);
  assert.equal(summary.otherTimeHours, 3);
  assert.equal(summary.totalEarnings, 84);
  assert.equal(summary.passiveEarnings, 60);
  assert.equal(summary.activeEarnings, 24);
  assert.equal(summary.totalSpend, 50);
  assert.equal(summary.upkeepSpend, 8);
  assert.equal(summary.investmentSpend, 42);
  assert.equal(summary.timeBreakdown.length, 2);
  assert.equal(summary.passiveBreakdown.length, 1);
  assert.equal(summary.earningsBreakdown.length, 1);
  assert.equal(summary.spendBreakdown.length, 2);
});

test('daily summary attaches definition references for canonical metrics', () => {
  configureRegistry(registry);
  const state = initializeState();
  resetDailyMetrics(state);

  recordTimeContribution({
    key: 'asset:blog:setup-time',
    label: '🚀 Blog setup',
    hours: 3,
    category: 'setup'
  });
  recordPayoutContribution({
    key: 'hustle:freelance:payout',
    label: '💼 Freelance payout',
    amount: 20,
    category: 'hustle'
  });
  recordCostContribution({
    key: 'asset:blog:maintenance-cost',
    label: '🔧 Blog upkeep',
    amount: 5,
    category: 'maintenance'
  });

  const summary = computeDailySummary(state);

  const setupEntry = summary.timeBreakdown.find(entry => entry.key === 'asset:blog:setup-time');
  assert.ok(setupEntry?.definition, 'setup entry should include definition metadata');
  assert.equal(setupEntry.definition.name, 'Personal Blog Network');
  assert.equal(setupEntry.definition.category, 'setup');

  const hustleEntry = summary.earningsBreakdown.find(entry => entry.key === 'hustle:freelance:payout');
  assert.ok(hustleEntry?.definition, 'earnings entry should include definition metadata');
  assert.equal(hustleEntry.definition.category, 'action');

  const maintenanceEntry = summary.spendBreakdown.find(
    entry => entry.key === 'asset:blog:maintenance-cost'
  );
  assert.ok(maintenanceEntry?.definition, 'spend entry should include definition metadata');
  assert.equal(maintenanceEntry.definition.category, 'maintenance');
});

test('lifetime totals accumulate alongside daily metrics', () => {
  configureRegistry(registry);
  const state = initializeState();
  resetDailyMetrics(state);

  recordPayoutContribution({
    key: 'test:lifetime:income',
    label: '💰 Bonus windfall',
    amount: 120,
    category: 'bonus'
  });
  recordCostContribution({
    key: 'test:lifetime:cost',
    label: '🛠 Tool refresh',
    amount: 45,
    category: 'maintenance'
  });

  assert.equal(state.totals.earned, 120, 'earned totals should track payout contributions');
  assert.equal(state.totals.spent, 45, 'spent totals should track cost contributions');
});
