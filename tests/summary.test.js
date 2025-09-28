import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from './helpers/setupDom.js';

ensureTestDom();

const { configureRegistry, initializeState } = await import('../src/core/state.js');
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
  assert.equal(summary.earningsBreakdown.length, 2);
  assert.equal(summary.spendBreakdown.length, 2);
});
