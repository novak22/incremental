import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import timodoroApp from '../../../src/ui/views/browser/apps/timodoro/ui.js';
import renderTimodoro from '../../../src/ui/views/browser/apps/timodoro.js';
import { buildTimodoroViewModel } from '../../../src/ui/views/browser/apps/timodoro/model.js';
import { buildTodoGroups } from '../../../src/ui/views/browser/apps/timodoro/sections/todoSection.js';

function withDom(t) {
  const dom = new JSDOM('<body><main id="mount"></main></body>', { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  const previousMutationObserver = globalThis.MutationObserver;
  globalThis.MutationObserver = dom.window.MutationObserver;
  t.after(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    if (previousMutationObserver) {
      globalThis.MutationObserver = previousMutationObserver;
    } else {
      delete globalThis.MutationObserver;
    }
  });
  return dom;
}

function createContext(document) {
  const sections = new Map();
  const main = document.querySelector('main') || document.createElement('main');
  if (!main.parentElement) {
    document.body.appendChild(main);
  }

  return {
    ensurePageContent(page, builder) {
      let refs = sections.get(page.id);
      if (!refs) {
        const section = document.createElement('section');
        section.dataset.browserPage = page.id;
        const body = document.createElement('div');
        body.className = 'browser-page__body';
        section.appendChild(body);
        main.appendChild(section);
        refs = { section, body };
        sections.set(page.id, refs);
      }
      if (typeof builder === 'function') {
        builder(refs);
      }
      return refs;
    }
  };
}

test('buildTodoGroups normalizes queue entries via shared builder', () => {
  const { items } = buildTodoGroups([
    {
      id: 'test-hustle',
      focusCategory: 'hustle',
      payout: 150,
      schedule: 'daily',
      durationHours: 2
    }
  ]);

  const hustleItems = items.hustle || [];
  assert.equal(hustleItems.length, 1, 'groups include hustle bucket');
  const detail = hustleItems[0]?.detail || '';
  assert.ok(detail.includes('$150'), 'detail surfaces payout text');
  assert.ok(detail.includes('2h'), 'detail includes normalized duration');
});

test('timodoro component renders flow workspace and pulse stack', t => {
  const dom = withDom(t);
  const { document } = dom.window;

  const mount = document.createElement('div');
  mount.dataset.role = 'timodoro-root';
  document.body.appendChild(mount);

  const viewModel = {
    meta: '3 tasks logged • 6h logged • $320 earned',
    todoEntries: [
      {
        title: 'Draft pitch deck',
        durationText: '2h focus',
        durationHours: 2,
        meta: 'Client work',
        moneyCost: 120,
        focusCategory: 'hustle'
      },
      {
        title: 'Research module',
        durationText: '1h study',
        meta: 'Curriculum update',
        focusCategory: 'education'
      },
      {
        title: 'Overbooked sprint',
        durationText: '5h focus',
        durationHours: 5,
        focusCategory: 'hustle'
      }
    ],
    todoEmptyMessage: 'Queue a hustle or upgrade to add new tasks.',
    todoHoursAvailable: 4,
    completedGroups: {
      hustles: [{ name: 'Logo sprint', detail: '2h logged' }],
      education: [],
      upkeep: [],
      upgrades: []
    },
    recurringEntries: [],
    summaryEntries: [
      { label: 'Hours logged', value: '2h', note: 'Across all workstreams today.' }
    ],
    breakdownEntries: [
      { label: 'Active work', value: '2h' },
      { label: 'Hours remaining', value: '4h' }
    ],
    hoursAvailableLabel: '4h',
    hoursSpentLabel: '2h',
    recurringEmpty: 'No upkeep logged yet. Assistants will report here.',
    totalWins: 1,
    focusStreakDays: 3
  };

  const summary = timodoroApp.render(viewModel, { mount });

  assert.equal(summary.meta, viewModel.meta, 'render returns view model meta');
  assert.equal(mount.className, 'timodoro timodoro--flow', 'mount receives flow root classes');

  const timeline = mount.querySelector('.timodoro-canvas');
  assert.ok(timeline, 'timeline canvas rendered');
  const capsules = [...mount.querySelectorAll('.timodoro-capsule')];
  assert.ok(capsules.length >= 1, 'timeline capsules rendered');

  const flowGroups = [...mount.querySelectorAll('.timodoro-flow__group')]
    .map(group => group.dataset.group);
  assert.deepEqual(flowGroups, ['hustle', 'upgrade', 'study', 'other'], 'focus lanes rendered');

  const hustleItems = [
    ...mount.querySelectorAll('[data-group="hustle"] .timodoro-flow-item')
  ];
  assert.equal(hustleItems.length, 1, 'hustle lane renders available work');
  assert.equal(
    hustleItems[0].querySelector('.timodoro-flow-item__name')?.textContent,
    'Draft pitch deck'
  );
  assert.ok(
    hustleItems[0].querySelector('.timodoro-flow-item__detail')?.textContent.includes('Cost $120'),
    'hustle detail includes cost meta'
  );

  const studyItems = [
    ...mount.querySelectorAll('[data-group="study"] .timodoro-flow-item')
  ];
  assert.equal(studyItems.length, 1, 'study lane renders education entry');
  assert.equal(
    studyItems[0].querySelector('.timodoro-flow-item__name')?.textContent,
    'Research module'
  );

  const filtered = mount
    .querySelector('[data-group="hustle"]')
    ?.textContent.includes('Overbooked sprint');
  assert.equal(filtered, false, 'filters out tasks exceeding available focus hours');

  const upgradeEmpty = mount
    .querySelector('[data-group="upgrade"] .timodoro-flow__empty');
  assert.ok(upgradeEmpty, 'upgrade lane renders empty state');
  assert.equal(upgradeEmpty.textContent, 'Queue an upgrade to keep momentum.');

  const celebration = mount.querySelector('.timodoro-workspace__celebration');
  assert.ok(celebration, 'workspace celebrates logged wins');
  assert.ok(/Nice run/i.test(celebration.textContent));

  const fuelGauge = mount
    .querySelector('[data-role="timodoro-fuel-gauge"] .timodoro-gauge__value');
  assert.equal(fuelGauge?.textContent, '4h', 'fuel gauge reflects hours available');

  const focusGauge = mount
    .querySelector('[data-role="timodoro-focus-gauge"] .timodoro-gauge__value');
  assert.equal(focusGauge?.textContent, '2h', 'focus gauge reflects hours spent');

  const sentiment = mount.querySelector('.timodoro-pulse-panel__sentiment');
  assert.ok(sentiment, 'sentiment line rendered');
  assert.ok(sentiment.textContent.length > 0, 'sentiment communicates streak context');

  const reflection = mount.querySelector('.timodoro-reflection__copy');
  assert.ok(reflection, 'reflection prompt rendered');
  assert.ok(reflection.textContent.includes('emoji'), 'reflection copy encourages journaling');
});

test('timeline merges completed history with queued focus', t => {
  const dom = withDom(t);
  const { document } = dom.window;

  const mount = document.createElement('div');
  mount.dataset.role = 'timodoro-root';
  document.body.appendChild(mount);

  const viewModel = {
    meta: 'Focus mode ready',
    todoEntries: [
      { title: 'Next sprint', durationHours: 1, durationText: '1h focus', focusCategory: 'hustle' }
    ],
    completedGroups: {
      hustles: [{ name: 'Morning warm-up', detail: '1h logged' }],
      education: [],
      upkeep: [],
      upgrades: []
    },
    recurringEntries: [],
    summaryEntries: [],
    breakdownEntries: [],
    hoursAvailableLabel: '1h',
    hoursSpentLabel: '1h',
    timelineCompletedEntries: [
      {
        id: 'completed-1',
        title: 'Morning warm-up',
        durationHours: 1,
        durationText: '1h',
        completedAt: Date.now() - 30 * 60 * 1000,
        focusCategory: 'hustle'
      }
    ]
  };

  timodoroApp.render(viewModel, { mount });

  const capsules = [...mount.querySelectorAll('.timodoro-capsule')];
  assert.equal(capsules.length, 2, 'timeline merges completed and upcoming capsules');
  const statuses = capsules.map(capsule => capsule.dataset.status);
  assert.ok(statuses.includes('completed'), 'includes completed capsule');
  assert.ok(statuses.includes('active') || statuses.includes('upcoming'), 'includes upcoming capsule');
});

test('renderTimodoro returns page summary using workspace renderer', t => {
  const dom = withDom(t);
  const context = createContext(dom.window.document);

  const viewModel = {
    meta: 'Focus mode ready',
    completedGroups: {},
    recurringEntries: [],
    summaryEntries: [],
    breakdownEntries: [],
    hoursAvailableLabel: '6h',
    hoursSpentLabel: '0h'
  };

  const summary = renderTimodoro(context, [], { timodoro: viewModel });

  assert.ok(summary, 'summary is returned');
  assert.equal(summary.id, 'timodoro', 'summary includes timodoro page id');
  assert.equal(summary.meta, 'Focus mode ready', 'meta comes from provided view model');
  assert.equal(summary.urlPath, 'flow', 'workspace encodes single flow route');

  const mount = dom.window.document.querySelector('[data-role="timodoro-root"]');
  assert.ok(mount, 'workspace mount is created');
  assert.equal(mount.className, 'timodoro timodoro--flow', 'workspace renderer assigns flow classes');
});

test('buildTimodoroViewModel composes summary, recurring, and meta data', () => {
  const state = {
    baseTime: 6,
    bonusTime: 2,
    dailyBonusTime: 1,
    timeLeft: 3
  };

  const summary = {
    totalTime: 6,
    maintenanceHours: 2,
    totalEarnings: 320,
    activeEarnings: 200,
    passiveEarnings: 120,
    timeBreakdown: [
      { key: 'gig', label: 'Freelance Logo', hours: 3, category: 'hustle' },
      { key: 'course', label: 'Design Course', hours: 2, category: 'study' },
      { key: 'upkeep', label: 'Site updates', hours: 1, category: 'maintenance' }
    ],
    studyBreakdown: [
      {
        trackId: 'design',
        name: 'Design Deep Dive',
        hoursPerDay: 1.5,
        remainingDays: 3,
        studiedToday: true
      }
    ]
  };

  const todoModel = {
    hoursAvailable: 3,
    hoursAvailableLabel: '3h ready',
    hoursSpent: 5,
    entries: [
      { title: 'Design Blitz', durationText: '2h focus' }
    ],
    emptyMessage: 'Queue something inspiring.'
  };

  const viewModel = buildTimodoroViewModel(state, summary, todoModel);

  assert.equal(viewModel.hoursAvailableLabel, '3h ready', 'uses provided available label');
  assert.equal(viewModel.hoursSpentLabel, '5h', 'formats supplied hours spent');

  assert.equal(viewModel.todoEntries.length, 1, 'todo entries forwarded from todo model');
  assert.equal(viewModel.todoEntries[0].title, 'Design Blitz', 'retains source todo data');
  assert.ok(viewModel.todoEntries[0].durationText, 'shared model populates todo duration');
  assert.equal(
    viewModel.todoEmptyMessage,
    'Queue something inspiring.',
    'passes through todo empty state message'
  );
  assert.equal(viewModel.todoHoursAvailable, 3, 'includes raw todo hours available');
  assert.equal(viewModel.todoMoneyAvailable, null, 'omits money when unavailable');

  assert.equal(viewModel.summaryEntries.length, 3, 'summary entries include hours, earnings, time used');
  assert.equal(viewModel.breakdownEntries.length, 3, 'breakdown includes active, upkeep, remaining');

  const recurringLabels = viewModel.recurringEntries.map(entry => entry.name);
  assert.deepEqual(recurringLabels, ['Site updates', '📘 Design Deep Dive']);

  assert.equal(viewModel.completedGroups.hustles.length, 1, 'hustle group populated');
  assert.equal(viewModel.completedGroups.education.length, 1, 'education group populated from study');
  assert.equal(viewModel.completedGroups.upkeep.length, 1, 'upkeep group populated');

  assert.equal(viewModel.meta, '3 tasks logged • 6h logged • $320 earned');
});
