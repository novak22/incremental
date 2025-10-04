import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import timodoroApp from '../../../src/ui/views/browser/apps/timodoro/ui.js';
import renderTimodoro from '../../../src/ui/views/browser/apps/timodoro.js';
import { buildTimodoroViewModel } from '../../../src/ui/views/browser/apps/timodoro/model.js';

function withDom(t) {
  const dom = new JSDOM('<body><main id="mount"></main></body>', { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  t.after(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
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

test('timodoro component renders layout and populates lists', t => {
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
        meta: 'Client work',
        moneyCost: 120
      }
    ],
    todoEmptyMessage: 'Queue a hustle or upgrade to add new tasks.',
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
    recurringEmpty: 'No upkeep logged yet. Assistants will report here.'
  };

  const summary = timodoroApp.render(viewModel, { mount });

  assert.equal(summary.meta, viewModel.meta, 'render returns view model meta');
  assert.equal(mount.className, 'timodoro', 'mount receives root class');

  const tabs = [...mount.querySelectorAll('.timodoro-tabs__button')];
  assert.equal(tabs.length, 2, 'two navigation tabs rendered');
  assert.ok(tabs[0].classList.contains('is-active'), 'TODO tab active by default');

  const todoItems = [
    ...mount.querySelectorAll('[data-role="timodoro-todo-hustle"] .timodoro-list__item')
  ];
  assert.equal(todoItems.length, 1, 'todo tab renders active backlog');
  assert.equal(todoItems[0].querySelector('.timodoro-list__name')?.textContent, 'Draft pitch deck');
  assert.ok(
    todoItems[0].querySelector('.timodoro-list__meta')?.textContent.includes('Cost $120'),
    'todo item includes cost detail'
  );

  const upgradeEmpty = mount
    .querySelector('[data-role="timodoro-todo-upgrade"] .timodoro-list__empty');
  assert.ok(upgradeEmpty, 'upgrade lane renders empty state');
  assert.equal(upgradeEmpty.textContent, 'Queue an upgrade to keep momentum.');

  tabs[1].click();

  const available = mount.querySelector('[data-role="timodoro-hours-available"]');
  const spent = mount.querySelector('[data-role="timodoro-hours-spent"]');
  assert.equal(available?.textContent, '4h', 'available hours should update');
  assert.equal(spent?.textContent, '2h', 'spent hours should update');

  const donePanel = mount.querySelector('[data-tab="done"]');
  assert.equal(donePanel?.hidden, false, 'done tab becomes visible after selecting it');

  const hustleItems = [
    ...mount.querySelectorAll('[data-role="timodoro-completed-hustles"] .timodoro-list__item')
  ];
  assert.equal(hustleItems.length, 1, 'hustle list renders completed task');
  assert.equal(hustleItems[0].querySelector('.timodoro-list__name')?.textContent, 'Logo sprint');

  const educationEmpty = mount
    .querySelector('[data-role="timodoro-completed-education"] .timodoro-list__empty');
  assert.ok(educationEmpty, 'education bucket renders empty state');
  assert.equal(educationEmpty.textContent, 'No study blocks logged yet.');

  const recurringEmpty = mount.querySelector('[data-role="timodoro-recurring"] .timodoro-list__empty');
  assert.ok(recurringEmpty, 'recurring list renders empty state');
  assert.equal(recurringEmpty.textContent, 'No upkeep logged yet. Assistants will report here.');

  const summaryItems = [
    ...mount.querySelectorAll('[data-role="timodoro-stats"] .timodoro-stats__item')
  ];
  assert.equal(summaryItems.length, 1, 'summary list renders stats entries');
  assert.equal(summaryItems[0].querySelector('.timodoro-stats__label')?.textContent, 'Hours logged');
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

  const mount = dom.window.document.querySelector('[data-role="timodoro-root"]');
  assert.ok(mount, 'workspace mount is created');
  assert.equal(mount.className, 'timodoro', 'workspace renderer assigns root class');
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
  assert.equal(
    viewModel.todoEmptyMessage,
    'Queue something inspiring.',
    'passes through todo empty state message'
  );

  assert.equal(viewModel.summaryEntries.length, 3, 'summary entries include hours, earnings, time used');
  assert.equal(viewModel.breakdownEntries.length, 3, 'breakdown includes active, upkeep, remaining');

  const recurringLabels = viewModel.recurringEntries.map(entry => entry.name);
  assert.deepEqual(recurringLabels, ['Site updates', '📘 Design Deep Dive']);

  assert.equal(viewModel.completedGroups.hustles.length, 1, 'hustle group populated');
  assert.equal(viewModel.completedGroups.education.length, 1, 'education group populated from study');
  assert.equal(viewModel.completedGroups.upkeep.length, 1, 'upkeep group populated');

  assert.equal(viewModel.meta, '3 tasks logged • 6h logged • $320 earned');
});
