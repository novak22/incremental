import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDashboardViewModel,
  buildQuickActionModel,
  buildAssetActionModel,
  buildStudyEnrollmentActionModel
} from '../../src/ui/dashboard/model.js';
import { buildDefaultState } from '../../src/core/state.js';
import { getAssets, getUpgrades, resetRegistry } from '../../src/game/registryService.js';
import { ensureRegistryReady } from '../../src/game/registryBootstrap.js';
import {
  buildNicheViewModel,
  createHighlightDefaults,
  composeHighlightMessages,
  buildNicheHighlights,
  buildNicheHistoryModel,
  formatHistoryTimestamp
} from '../../src/ui/dashboard/nicheModel.js';
import {
  buildNotifications,
  buildNotificationModel,
  buildEventLog,
  buildEventLogModel
} from '../../src/ui/dashboard/notificationsModel.js';
import {
  buildDashboardActionModels,
  selectProvider,
  buildQuickActionsFromProvider,
  buildAssetActionsFromProvider,
  buildStudyActionsFromProvider
} from '../../src/ui/dashboard/actionProviders.js';

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
    watchlist: ['healthWellness']
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

test('nicheModel composes highlights and history utilities', () => {
  const defaults = createHighlightDefaults();
  assert.equal(typeof defaults.hot.title, 'string');

  const summary = {
    hot: { name: 'Tech', trendImpact: 12, multiplier: 1.2, assetCount: 2, netEarnings: 150 },
    swing: { name: 'Travel', delta: -3, multiplier: 0.9, score: 62 },
    risk: { name: 'DIY', trendImpact: -8, assetCount: 1, multiplier: 0.8 }
  };
  const messages = composeHighlightMessages(summary);
  assert.ok(messages.hot.title.includes('Tech'));
  assert.ok(messages.swing.note.includes('payouts'));
  assert.ok(messages.risk.note.includes('venture'));

  const analytics = [
    { id: 'tech', watchlisted: true },
    { id: 'travel', watchlisted: false }
  ];
  const highlights = buildNicheHighlights(analytics);
  assert.ok(highlights.hot.title);

  const state = { niches: { analyticsHistory: [{ day: 2, recordedAt: Date.UTC(2024, 0, 3, 12), analytics }] } };
  const history = buildNicheHistoryModel(state);
  assert.equal(history.entries.length, 1);
  assert.ok(history.entries[0].recordedAtISO.includes('2024-01-03'));

  const timestamp = formatHistoryTimestamp(Date.UTC(2024, 0, 1, 8));
  assert.ok(timestamp.label.includes('Jan'));

  const nicheViewModel = buildNicheViewModel({ niches: { analyticsHistory: [] } });
  assert.ok(nicheViewModel.board.entries);
});

test('notificationsModel builds notifications and event logs', t => {
  const state = buildDefaultState();
  state.money = 1000;
  state.upgrades = { sampleUpgrade: { purchased: false } };
  state.log = [
    { id: 'log-old', timestamp: Date.now() - 1000, message: 'Older event', type: 'info' },
    { id: 'log-new', timestamp: Date.now(), message: 'New event', type: 'alert' }
  ];

  const stubAsset = { id: 'notify-asset', name: 'Notifier', maintenance: { cost: 10 } };
  const stubUpgrade = { id: 'sampleUpgrade', name: 'Sample Upgrade', cost: 100, repeatable: false };
  const assets = getAssets();
  assets.push(stubAsset);
  const upgrades = getUpgrades();
  upgrades.push(stubUpgrade);
  state.assets[stubAsset.id] = {
    instances: [
      { id: 'inst-1', status: 'active', maintenanceFundedToday: false }
    ]
  };

  const notifications = buildNotifications(state);
  assert.ok(notifications.some(entry => entry.id.includes('maintenance')));

  const notificationModel = buildNotificationModel(state);
  assert.ok(notificationModel.entries.length >= notifications.length);

  const eventLog = buildEventLog(state);
  assert.equal(eventLog[0].id, 'log-new');

  const eventLogModel = buildEventLogModel(state);
  assert.ok(eventLogModel.entries.length > 0);

  t.after(() => {
    assets.pop();
    upgrades.pop();
  });
});

test('actionProviders compose models from providers', () => {
  const state = {
    day: 2,
    timeLeft: 4,
    baseTime: 6,
    bonusTime: 1,
    dailyBonusTime: 1,
    money: 500
  };

  const providerSnapshots = [
    {
      id: 'quick-actions',
      focusCategory: 'hustle',
      metrics: { hoursAvailable: 3, hoursSpent: 5 },
      entries: [
        {
          id: 'quick-1',
          title: 'Quick Shot',
          durationHours: 1,
          payout: 120,
          payoutText: '$120',
          onClick: () => {}
        }
      ]
    },
    {
      id: 'asset-upgrades',
      focusCategory: 'upgrade',
      metrics: { defaultLabel: 'Boost', moneyAvailable: 400 },
      entries: [
        {
          id: 'asset-1',
          title: 'Upgrade Venture',
          durationHours: 2,
          moneyCost: 200,
          onClick: () => {}
        }
      ]
    },
    {
      id: 'study-enrollment',
      focusCategory: 'study',
      metrics: { hoursAvailable: 2, hoursSpent: 2 },
      entries: [
        {
          id: 'study-1',
          title: 'Enroll Course',
          durationHours: 1,
          moneyCost: 50,
          onClick: () => {}
        }
      ]
    }
  ];

  const quickProvider = selectProvider(providerSnapshots, 'quick-actions', 'hustle');
  assert.equal(quickProvider.id, 'quick-actions');

  const quickModel = buildQuickActionsFromProvider(state, quickProvider);
  assert.equal(quickModel.entries.length, 1);

  const assetModel = buildAssetActionsFromProvider(state, providerSnapshots[1]);
  assert.equal(assetModel.entries[0].buttonLabel, 'Boost');

  const studyModel = buildStudyActionsFromProvider(state, providerSnapshots[2]);
  assert.ok(studyModel.hoursAvailableLabel.includes('h'));

  const composite = buildDashboardActionModels(state, providerSnapshots);
  assert.equal(composite.quickActions.entries.length, 1);
  assert.equal(composite.assetActions.entries.length, 1);
  assert.equal(composite.studyActions.entries.length, 1);
});

test('model re-exports base action builders', () => {
  assert.equal(typeof buildQuickActionModel, 'function');
  assert.equal(typeof buildAssetActionModel, 'function');
  assert.equal(typeof buildStudyEnrollmentActionModel, 'function');
});
