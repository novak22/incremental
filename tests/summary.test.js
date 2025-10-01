import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from './helpers/setupDom.js';

ensureTestDom();

const { initializeState } = await import('../src/core/state.js');
const { configureRegistry } = await import('../src/core/state/registry.js');
const registryService = await import('../src/game/registryService.js');
const { loadDefaultRegistry } = await import('../src/game/registryLoader.js');
const {
  recordCostContribution,
  recordPayoutContribution,
  recordTimeContribution,
  resetDailyMetrics
} = await import('../src/game/metrics.js');
const { computeDailySummary } = await import('../src/game/summary.js');
const {
  selectDailyTimeEntries,
  selectDailyPayoutEntries,
  selectDailyCostEntries,
  selectStudyProgressEntries
} = await import('../src/game/summary/selectors.js');

test('daily summary aggregates metrics into category totals', () => {
  registryService.resetRegistry();
  loadDefaultRegistry();
  configureRegistry();
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

  assert.equal(summary.timeBreakdown[0].hours, 3);
  assert.equal(summary.earningsBreakdown[0].amount, 24);
  assert.equal(summary.passiveBreakdown[0].stream, 'passive');
  assert.equal(summary.spendBreakdown[0].amount, 42);
});

test('daily summary attaches definition references for canonical metrics', () => {
  registryService.resetRegistry();
  loadDefaultRegistry();
  configureRegistry();
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

test('raw selectors return numeric breakdown entries', () => {
  registryService.resetRegistry();
  loadDefaultRegistry();
  configureRegistry();
  const state = initializeState();
  resetDailyMetrics(state);

  recordTimeContribution({
    key: 'selector:time',
    label: '⌛ Selector Time',
    hours: 4,
    category: 'maintenance'
  });

  recordPayoutContribution({
    key: 'selector:earnings',
    label: '💼 Selector Earnings',
    amount: 75,
    category: 'passive'
  });

  recordCostContribution({
    key: 'selector:cost',
    label: '🔧 Selector Cost',
    amount: 18,
    category: 'maintenance'
  });

  state.progress = state.progress || {};
  state.progress.knowledge = {
    outlineMastery: {
      enrolled: true,
      completed: false,
      daysCompleted: 1,
      studiedToday: false
    }
  };

  const timeEntries = selectDailyTimeEntries(state);
  const payoutEntries = selectDailyPayoutEntries(state);
  const costEntries = selectDailyCostEntries(state);
  const studyEntries = selectStudyProgressEntries(state);

  assert.equal(timeEntries.length, 1);
  assert.equal(timeEntries[0].hours, 4);
  assert.equal(timeEntries[0].category, 'maintenance');

  assert.equal(payoutEntries.length, 1);
  assert.equal(payoutEntries[0].amount, 75);
  assert.equal(payoutEntries[0].stream, 'passive');

  assert.equal(costEntries.length, 1);
  assert.equal(costEntries[0].amount, 18);
  assert.equal(costEntries[0].category, 'maintenance');

  assert.equal(studyEntries.length, 1);
  assert.equal(studyEntries[0].remainingDays, 4);
  assert.equal(studyEntries[0].status, 'waiting');
});

test('lifetime totals accumulate alongside daily metrics', () => {
  registryService.resetRegistry();
  loadDefaultRegistry();
  configureRegistry();
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
