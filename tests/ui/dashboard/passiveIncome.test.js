import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailySummaries } from '../../../src/ui/dashboard/passiveIncome.js';
import { buildDefaultState } from '../../../src/core/state.js';
import { loadRegistry, resetRegistry } from '../../../src/game/registryService.js';

function createSummary(overrides = {}) {
  const base = {
    totalEarnings: 300,
    activeEarnings: 180,
    passiveEarnings: 120,
    totalSpend: 90,
    upkeepSpend: 30,
    investmentSpend: 60,
    setupHours: 1,
    maintenanceHours: 1,
    otherTimeHours: 2,
    totalTime: 4,
    timeBreakdown: [
      { key: 'focus-1', label: 'Design Sprint', hours: 1.5, category: 'active' }
    ],
    earningsBreakdown: [
      { key: 'earn-1', label: 'Freelance gig', amount: 180, category: 'active' }
    ],
    passiveBreakdown: [
      { key: 'asset:rig', label: '💰 Rig payout', amount: 120, category: 'passive', source: { type: 'asset', name: 'Analytics Rig', count: 1 } }
    ],
    spendBreakdown: [
      { key: 'spend-1', label: 'Maintenance', amount: 30, category: 'maintenance' }
    ],
    studyBreakdown: [],
    knowledgeInProgress: 0,
    knowledgePendingToday: 0
  };
  return { ...base, ...overrides };
}

test('buildDailySummaries composes header metrics and queue entries', () => {
  resetRegistry();
  loadRegistry({ hustles: [], assets: [], upgrades: [] });

  const state = buildDefaultState();
  state.timeLeft = 6;
  state.baseTime = 8;
  state.bonusTime = 1;
  state.dailyBonusTime = 1;
  state.money = 500;

  const daily = buildDailySummaries(state, createSummary());

  assert.ok(daily.headerMetrics.dailyPlus.value.startsWith('$'));
  assert.ok(Array.isArray(daily.queue.items));
  assert.equal(daily.queue.items[0].label, 'Design Sprint');
  assert.ok(daily.queue.items[0].hoursLabel.includes('h'));
  assert.ok(Array.isArray(daily.dailyStats.earnings.passive.entries));
  assert.ok(daily.dailyStats.earnings.passive.entries[0].value.includes('today'));
});
