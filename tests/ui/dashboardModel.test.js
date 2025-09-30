import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';

ensureTestDom();

const {
  buildDashboardModel,
  buildDailyStats,
  buildNotifications,
  buildQueueEntries
} = await import('../../src/ui/dashboard/model.js');
const { registry } = await import('../../src/game/registry.js');

function stubRegistry({ assets = [], hustles = [], upgrades = [] } = {}) {
  const originalAssets = Object.getOwnPropertyDescriptor(registry, 'assets');
  const originalHustles = Object.getOwnPropertyDescriptor(registry, 'hustles');
  const originalUpgrades = Object.getOwnPropertyDescriptor(registry, 'upgrades');

  Object.defineProperty(registry, 'assets', {
    configurable: true,
    enumerable: true,
    get: () => assets
  });
  Object.defineProperty(registry, 'hustles', {
    configurable: true,
    enumerable: true,
    get: () => hustles
  });
  Object.defineProperty(registry, 'upgrades', {
    configurable: true,
    enumerable: true,
    get: () => upgrades
  });

  return () => {
    Object.defineProperty(registry, 'assets', originalAssets);
    Object.defineProperty(registry, 'hustles', originalHustles);
    Object.defineProperty(registry, 'upgrades', originalUpgrades);
  };
}

function createState(overrides = {}) {
  return {
    day: 1,
    money: 0,
    timeLeft: 0,
    baseTime: 0,
    bonusTime: 0,
    dailyBonusTime: 0,
    upgrades: {},
    assets: {},
    progress: { knowledge: {} },
    niches: { watchlist: [] },
    log: [],
    ...overrides
  };
}

test('dashboard header metrics include income and spend segments', () => {
  const restore = stubRegistry({ assets: [], hustles: [], upgrades: [] });
  try {
    const state = createState({
      day: 5,
      money: 1234,
      timeLeft: 6,
      baseTime: 8,
      bonusTime: 2,
      dailyBonusTime: 2
    });

    const summary = {
      totalEarnings: 450,
      activeEarnings: 300,
      passiveEarnings: 150,
      totalSpend: 200,
      upkeepSpend: 120,
      investmentSpend: 80,
      setupHours: 2,
      maintenanceHours: 1
    };

    const model = buildDashboardModel(state, summary);

    assert.ok(model, 'expected dashboard model');
    assert.equal(model.session.statusText, 'Day 5 • 6h remaining');
    assert.equal(model.session.moneyText, '$1,234');
    assert.equal(model.headerMetrics.dailyPlus.note, '$300 active • $150 passive');
    assert.equal(model.headerMetrics.dailyMinus.note, '$120 upkeep • $80 invest • Net +$250');
    assert.equal(model.headerMetrics.timeReserved.note, '2h setup • 1h upkeep • 3h hustle');
    assert.equal(model.kpis.net.value, '$250');
    assert.equal(model.kpis.hours.note, 'Plenty of hustle hours left.');
  } finally {
    restore();
  }
});

test('queue entries provide idle fallback when no actions scheduled', () => {
  const items = buildQueueEntries({});
  assert.equal(items.length, 1);
  assert.equal(items[0].label, 'Nothing queued yet');
  assert.equal(items[0].state, 'idle');
});

test('notifications include panel targets for upkeep and upgrades', () => {
  const restore = stubRegistry({
    assets: [
      {
        id: 'studio',
        name: 'Studio Loft',
        maintenance: { cost: 75 }
      }
    ],
    hustles: [],
    upgrades: [
      { id: 'spark', name: 'Spark Generator', cost: 40 }
    ]
  });

  try {
    const state = createState({ money: 100 });
    state.assets.studio = {
      instances: [
        { id: 'a', status: 'active', maintenanceFundedToday: false }
      ]
    };
    state.upgrades = {};

    const notifications = buildNotifications(state);

    assert.ok(notifications.some(note => note.targetPanel === 'panel-ventures'), 'expected upkeep notification');
    assert.ok(notifications.some(note => note.targetPanel === 'panel-upgrades'), 'expected upgrade notification');
  } finally {
    restore();
  }
});

test('daily stats summarize activity with friendly messages', () => {
  const stats = buildDailyStats({
    totalTime: 5,
    setupHours: 1,
    maintenanceHours: 1,
    otherTimeHours: 3,
    totalEarnings: 210,
    activeEarnings: 120,
    passiveEarnings: 90,
    totalSpend: 80,
    upkeepSpend: 50,
    investmentSpend: 30,
    knowledgeInProgress: 2,
    knowledgePendingToday: 1,
    timeBreakdown: [{ label: 'Prep', value: '2h' }],
    earningsBreakdown: [{ label: 'Clients', value: '$120' }],
    passiveBreakdown: [{ label: 'Royalties', value: '$90' }],
    spendBreakdown: [{ label: 'Upkeep', value: '$50' }],
    studyBreakdown: [{ label: 'Design Basics', value: 'Day 3' }]
  });

  assert.equal(stats.time.summary, '5h invested • 1h setup • 1h upkeep • 3h flex');
  assert.equal(stats.earnings.summary, '$210 earned • $120 active • $90 passive');
  assert.equal(stats.spend.summary, '$80 spent • $50 upkeep • $30 investments');
  assert.equal(stats.study.summary, '2 tracks in flight • 1 session waiting today');
  assert.equal(stats.time.entries[0].label, 'Prep');
  assert.equal(stats.earnings.active.entries[0].label, 'Clients');
});
