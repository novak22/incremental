import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

import { ensureElements, renderView } from '../../../src/ui/views/browser/apps/timodoro/ui.js';
import { buildTimodoroViewModel } from '../../../src/ui/views/browser/apps/timodoro/model.js';

function withDom(t) {
  const dom = new JSDOM('<body><main id="mount"></main></body>', { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  return dom;
}

test('ensureElements builds layout and renderView populates lists', t => {
  const dom = withDom(t);

  t.after(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
  });

  const body = dom.window.document.body;
  const refs = ensureElements(body);
  assert.ok(refs?.root, 'timodoro root should be created');
  assert.equal(refs.root.dataset.role, 'timodoro-root');

  const viewModel = {
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
    hoursSpentLabel: '2h'
  };

  renderView(refs, viewModel);

  assert.equal(refs.availableValue.textContent, '4h', 'available hours should update');
  assert.equal(refs.spentValue.textContent, '2h', 'spent hours should update');

  const hustleItems = [...refs.completedLists.hustles.querySelectorAll('.timodoro-list__item')];
  assert.equal(hustleItems.length, 1, 'hustle list renders completed task');
  assert.equal(hustleItems[0].querySelector('.timodoro-list__name').textContent, 'Logo sprint');

  const educationEmpty = refs.completedLists.education.querySelector('.timodoro-list__empty');
  assert.ok(educationEmpty, 'education bucket renders empty state');
  assert.equal(educationEmpty.textContent, 'No study blocks logged yet.');

  const recurringEmpty = refs.recurringList.querySelector('.timodoro-list__empty');
  assert.ok(recurringEmpty, 'recurring list renders empty state');
  assert.equal(recurringEmpty.textContent, 'No upkeep logged yet. Assistants will report here.');

  const summaryItems = [...refs.summaryList.querySelectorAll('.timodoro-stats__item')];
  assert.equal(summaryItems.length, 1, 'summary list renders stats entries');
  assert.equal(
    summaryItems[0].querySelector('.timodoro-stats__label').textContent,
    'Hours logged'
  );
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
    hoursSpent: 5
  };

  const viewModel = buildTimodoroViewModel(state, summary, todoModel);

  assert.equal(viewModel.hoursAvailableLabel, '3h ready', 'uses provided available label');
  assert.equal(viewModel.hoursSpentLabel, '5h', 'formats supplied hours spent');

  assert.equal(viewModel.summaryEntries.length, 3, 'summary entries include hours, earnings, time used');
  assert.equal(viewModel.breakdownEntries.length, 3, 'breakdown includes active, upkeep, remaining');

  const recurringLabels = viewModel.recurringEntries.map(entry => entry.name);
  assert.deepEqual(recurringLabels, ['Site updates', '📘 Design Deep Dive']);

  assert.equal(viewModel.completedGroups.hustles.length, 1, 'hustle group populated');
  assert.equal(viewModel.completedGroups.education.length, 1, 'education group populated from study');
  assert.equal(viewModel.completedGroups.upkeep.length, 1, 'upkeep group populated');

  assert.equal(viewModel.meta, '3 tasks logged • 6h logged • $320 earned');
});
