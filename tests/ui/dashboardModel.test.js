import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardViewModel } from '../../src/ui/dashboard/model.js';
import { buildDefaultState } from '../../src/core/state.js';
import { getAssets, resetRegistry } from '../../src/game/registryService.js';
import { ensureRegistryReady } from '../../src/game/registryBootstrap.js';

test.before(() => {
  resetRegistry();
  ensureRegistryReady();
});

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
      { key: 'queue-1', label: 'Prototype sprint', hours: 2, category: 'active' }
    ],
    earningsBreakdown: [
      {
        key: 'earn-1',
        label: 'Freelance gig',
        amount: 180,
        category: 'active',
        stream: 'active',
        definition: { id: 'earn-1', name: 'Freelance' }
      }
    ],
    passiveBreakdown: [
      {
        key: 'asset:rig:payout',
        label: '💰 Rig payout',
        amount: 220,
        category: 'passive',
        stream: 'passive',
        source: { type: 'asset', name: 'Analytics Rig', count: 2 }
      }
    ],
    spendBreakdown: [
      { key: 'spend-1', label: '🛠 Maintenance', amount: 60, category: 'maintenance' }
    ],
    studyBreakdown: [
      {
        trackId: 'outlineMastery',
        name: 'Outline Mastery Workshop',
        hoursPerDay: 2,
        remainingDays: 3,
        studiedToday: false,
        status: 'waiting'
      }
    ],
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
  const assets = getAssets();
  assets.push(stubAsset);
  t.after(() => {
    assets.pop();
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

  const timeEntries = viewModel.dailyStats.time.entries;
  assert.equal(timeEntries[0].value.includes('today'), true);

  const activeEntry = viewModel.dailyStats.earnings.active.entries[0];
  assert.equal(activeEntry.label, 'Freelance gig');
  assert.ok(activeEntry.value.includes('$180'));

  const passiveEntry = viewModel.dailyStats.earnings.passive.entries[0];
  assert.ok(passiveEntry.label.includes('Analytics Rig'));
  assert.ok(passiveEntry.label.includes('(2)'));

  const spendEntry = viewModel.dailyStats.spend.entries[0];
  assert.ok(spendEntry.value.includes('$60'));

  const studyEntry = viewModel.dailyStats.study.entries[0];
  assert.ok(studyEntry.label.startsWith('📘'));
  assert.ok(studyEntry.value.includes('waiting'));

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

  assert.ok(viewModel.niche, 'expected niche view model');
  assert.equal(viewModel.niche.watchlistCount, 0);
  assert.ok(Array.isArray(viewModel.niche.board.entries));
  assert.ok(viewModel.niche.board.entries.every(entry => entry.assetCount === 0));
  assert.equal(typeof viewModel.niche.highlights.hot.title, 'string');
  assert.notEqual(viewModel.niche.highlights.hot.title, '');
});

test('buildDashboardViewModel includes niche analytics data', t => {
  const state = buildDefaultState();
  state.day = 5;
  state.money = 2000;
  state.timeLeft = 4;

  state.niches = {
    popularity: {
      techInnovators: { score: 82, previousScore: 70 },
      healthWellness: { score: 38, previousScore: 44 }
    },
    watchlist: ['healthWellness'],
    lastRollDay: state.day
  };

  const stubAsset = {
    id: 'niche-asset-test',
    name: 'Niche Analytics Rig',
    singular: 'Analytics Rig',
    maintenance: { cost: 10 }
  };

  const assets = getAssets();
  assets.push(stubAsset);
  t.after(() => {
    assets.pop();
  });

  state.assets[stubAsset.id] = {
    instances: [
      {
        id: 'instance-1',
        status: 'active',
        nicheId: 'techInnovators',
        lastIncome: 150,
        lastIncomeBreakdown: {
          total: 150,
          entries: [
            { type: 'niche', amount: 45, label: 'Trend bonus' }
          ]
        }
      }
    ]
  };

  const summary = createSummary();
  const viewModel = buildDashboardViewModel(state, summary);

  const nicheModel = viewModel.niche;
  assert.ok(nicheModel, 'expected niche model to exist');
  assert.equal(nicheModel.watchlistCount, 1);

  const entries = nicheModel.board.entries;
  assert.ok(entries.length > 0, 'expected niche entries');
  const techEntry = entries.find(entry => entry.id === 'techInnovators');
  assert.ok(techEntry, 'expected tech innovators entry');
  assert.equal(techEntry.assetCount, 1);
  assert.equal(techEntry.trendImpact, 45);
  assert.equal(techEntry.netEarnings, 150);
  assert.equal(techEntry.status, 'Heating Up');

  const highlightTitle = nicheModel.highlights.hot.title;
  assert.ok(highlightTitle.includes('Tech Innovators'));
  assert.ok(Array.isArray(nicheModel.history.entries));
  assert.equal(nicheModel.history.entries.length, 0);
});

test('buildNicheViewModel formats stored history snapshots', t => {
  const state = buildDefaultState();
  state.niches.analyticsHistory = [
    {
      id: 'history-1',
      day: 4,
      recordedAt: Date.UTC(2024, 0, 5, 15, 30),
      analytics: [
        {
          id: 'techInnovators',
          definition: { id: 'techInnovators', name: 'Tech Innovators' },
          watchlisted: true,
          assetCount: 2,
          netEarnings: 210,
          trendImpact: 60,
          baselineEarnings: 150,
          popularity: { score: 82, previousScore: 70, delta: 8, multiplier: 1.25 },
          assetBreakdown: [{ name: 'Analytics Rig', count: 2 }],
          status: 'Heating Up'
        }
      ],
      highlights: {
        hot: {
          id: 'techInnovators',
          name: 'Tech Innovators',
          assetCount: 2,
          netEarnings: 210,
          trendImpact: 60,
          multiplier: 1.25,
          delta: 8,
          score: 82
        },
        swing: {
          id: 'travelAdventures',
          name: 'Travel & Adventure',
          assetCount: 1,
          netEarnings: 95,
          trendImpact: 18,
          multiplier: 1.15,
          delta: 6,
          score: 74
        },
        risk: {
          id: 'homeDIY',
          name: 'Home & DIY',
          assetCount: 0,
          netEarnings: 0,
          trendImpact: -24,
          multiplier: 0.9,
          delta: -5,
          score: 42
        }
      }
    }
  ];

  const summary = createSummary();
  const viewModel = buildDashboardViewModel(state, summary);
  const history = viewModel.niche.history;

  assert.ok(Array.isArray(history.entries), 'expected history entries array');
  assert.equal(history.entries.length, 1, 'expected a single history entry');
  const entry = history.entries[0];
  assert.equal(entry.dayLabel, 'Day 4');
  assert.ok(entry.recordedAtLabel.includes('Jan'), 'expected formatted timestamp');
  assert.ok(entry.highlights.hot.title.includes('Tech Innovators'));
  assert.ok(entry.highlights.swing.note.includes('payouts'));
  assert.ok(entry.highlights.risk.note && entry.highlights.risk.note.length > 0);
});
