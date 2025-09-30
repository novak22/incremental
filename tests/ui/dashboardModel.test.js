import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardViewModel } from '../../src/ui/dashboard/model.js';
import { buildDefaultState } from '../../src/core/state.js';
import { registry } from '../../src/game/registry.js';

function createSummary(overrides = {}) {
  const base = {
    totalEarnings: 540,
    activeEarnings: 320,
    passiveEarnings: 220,
    totalSpend: 180,
    upkeepSpend: 80,
    investmentSpend: 100,
    setupHours: 1,
    maintenanceHours: 2,
    otherTimeHours: 3,
    totalTime: 6,
    timeBreakdown: [
      { key: 'queue-1', label: 'Prototype sprint', value: '2h', hours: 2, category: 'active' }
    ],
    earningsBreakdown: [
      { label: 'Freelance gig', value: '$180', definition: { id: 'earn-1', name: 'Freelance' } }
    ],
    passiveBreakdown: [],
    spendBreakdown: [],
    studyBreakdown: [],
    knowledgeInProgress: 1,
    knowledgePendingToday: 1
  };
  return { ...base, ...overrides };
}

test('buildDashboardViewModel produces derived dashboard sections', t => {
  const state = buildDefaultState();
  state.day = 3;
  state.money = 1234;
  state.timeLeft = 5;
  state.baseTime = 10;
  state.bonusTime = 2;
  state.dailyBonusTime = 1;
  const now = Date.now();
  state.log = [
    { id: 'log-1', timestamp: now, message: 'Closed a big deal.' },
    { id: 'log-2', timestamp: now - 1000, message: 'Queued a hustle.' }
  ];

  const stubAsset = {
    id: 'vm-test-asset',
    name: 'View Model Asset',
    maintenance: { cost: 75 }
  };
  registry.assets.push(stubAsset);
  t.after(() => {
    registry.assets.pop();
  });

  state.assets[stubAsset.id] = {
    instances: [
      {
        id: 'asset-1',
        status: 'active',
        maintenanceFundedToday: false
      }
    ]
  };

  const summary = createSummary();
  const viewModel = buildDashboardViewModel(state, summary);

  assert.ok(viewModel, 'view model should exist');
  assert.match(viewModel.session.statusText, /Day 3/);
  assert.equal(viewModel.session.moneyText.startsWith('$'), true);

  const incomeNote = viewModel.headerMetrics.dailyPlus.note;
  assert.ok(incomeNote.includes('active') && incomeNote.includes('passive'));

  const spendNote = viewModel.headerMetrics.dailyMinus.note;
  assert.ok(spendNote.includes('Net +'));

  assert.equal(viewModel.queue.items[0].label, 'Prototype sprint');
  assert.ok(viewModel.queue.items[0].hoursLabel.includes('h'));

  assert.ok(Array.isArray(viewModel.quickActions.entries));
  assert.ok(Array.isArray(viewModel.assetActions.entries));

  const notifications = viewModel.notifications.entries;
  assert.ok(notifications.length > 0, 'expected at least one notification');
  assert.equal(notifications[0].action.type, 'shell-tab');

  const eventEntries = viewModel.eventLog.entries;
  assert.ok(eventEntries.length > 0, 'expected event log entries');
  assert.notEqual(eventEntries[0].timeLabel, '');

  const timeSummary = viewModel.dailyStats.time.summary;
  assert.ok(timeSummary.includes('invested'));
});
