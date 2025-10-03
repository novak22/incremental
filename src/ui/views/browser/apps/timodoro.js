import { formatHours, formatMoney } from '../../../../core/helpers.js';
import { getState } from '../../../../core/state.js';
import { computeDailySummary } from '../../../../game/summary.js';
import {
  buildQuickActionModel,
  buildAssetActionModel,
  buildStudyEnrollmentActionModel
} from '../../../dashboard/model.js';
import { buildSummaryPresentations } from '../../../dashboard/formatters.js';
import { composeTodoModel, createAutoCompletedEntries } from '../dashboardPresenter.js';
import { getPageByType } from './pageLookup.js';
import { createStat } from '../components/widgets.js';

let elements = null;

function formatCurrency(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || Math.abs(numeric) < 1e-4) {
    return '$0';
  }
  const absolute = Math.abs(numeric);
  const formatted = formatMoney(Math.round(absolute * 100) / 100);
  const prefix = numeric < 0 ? '-$' : '$';
  return `${prefix}${formatted}`;
}

function computeTimeCap(state = {}) {
  const base = Number(state?.baseTime) || 0;
  const bonus = Number(state?.bonusTime) || 0;
  const daily = Number(state?.dailyBonusTime) || 0;
  return Math.max(0, base + bonus + daily);
}

function createCard(title, summary) {
  const card = document.createElement('article');
  card.className = 'browser-card timodoro-card';

  const header = document.createElement('header');
  header.className = 'browser-card__header';

  const heading = document.createElement('h2');
  heading.className = 'browser-card__title';
  heading.textContent = title;
  header.appendChild(heading);

  if (summary) {
    const description = document.createElement('p');
    description.className = 'browser-card__summary';
    description.textContent = summary;
    header.appendChild(description);
  }

  card.appendChild(header);
  return card;
}

function ensureElements(body) {
  if (!body) return null;
  let root = body.querySelector('[data-role="timodoro-root"]');
  if (!root) {
    body.innerHTML = '';

    root = document.createElement('div');
    root.className = 'timodoro';
    root.dataset.role = 'timodoro-root';

    const header = document.createElement('header');
    header.className = 'timodoro__header';

    const title = document.createElement('h1');
    title.className = 'timodoro__title';
    title.textContent = 'TimoDoro';

    const subtitle = document.createElement('p');
    subtitle.className = 'timodoro__subtitle';
    subtitle.textContent = 'Track your hustle hours and assistant work.';

    header.append(title, subtitle);

    const grid = document.createElement('div');
    grid.className = 'timodoro__grid';

    const taskColumn = document.createElement('div');
    taskColumn.className = 'timodoro__column timodoro__column--tasks';

    const summaryColumn = document.createElement('div');
    summaryColumn.className = 'timodoro__column timodoro__column--summary';

    const taskCard = createCard('Task Log', 'Celebrate today’s finished focus blocks.');

    const completedSection = document.createElement('section');
    completedSection.className = 'timodoro-section';
    const completedHeading = document.createElement('h3');
    completedHeading.className = 'timodoro-section__title';
    completedHeading.textContent = 'Completed today';
    const completedGroups = document.createElement('div');
    completedGroups.className = 'timodoro-section__groups';

    const groupDefinitions = [
      { key: 'hustles', label: 'Hustles' },
      { key: 'education', label: 'Education' },
      { key: 'upkeep', label: 'Upkeep' },
      { key: 'upgrades', label: 'Upgrades' }
    ];

    const completedLists = {};

    groupDefinitions.forEach(({ key, label }) => {
      const group = document.createElement('section');
      group.className = 'timodoro-subsection';

      const heading = document.createElement('h4');
      heading.className = 'timodoro-subsection__title';
      heading.textContent = label;

      const list = document.createElement('ul');
      list.className = 'timodoro-list timodoro-list--tasks';
      list.dataset.role = `timodoro-completed-${key}`;

      group.append(heading, list);
      completedGroups.appendChild(group);
      completedLists[key] = list;
    });

    completedSection.append(completedHeading, completedGroups);

    taskCard.append(completedSection);

    const recurringCard = createCard('Recurring / Assistant Work', 'Upkeep, maintenance, and study sessions auto-logged for you.');
    const recurringList = document.createElement('ul');
    recurringList.className = 'timodoro-list timodoro-list--tasks';
    recurringList.dataset.role = 'timodoro-recurring';
    recurringCard.appendChild(recurringList);

    taskColumn.append(taskCard, recurringCard);

    const snapshotCard = createCard('Today’s Snapshot', 'Where your hustle hours landed.');
    const stats = document.createElement('div');
    stats.className = 'browser-card__stats';
    const availableStat = createStat('Hours available', '0h');
    const availableValue = availableStat.querySelector('.browser-card__stat-value');
    const spentStat = createStat('Hours spent', '0h');
    const spentValue = spentStat.querySelector('.browser-card__stat-value');
    if (availableValue) {
      availableValue.dataset.role = 'timodoro-hours-available';
    }
    if (spentValue) {
      spentValue.dataset.role = 'timodoro-hours-spent';
    }
    stats.append(availableStat, spentStat);

    const breakdownList = document.createElement('ul');
    breakdownList.className = 'timodoro-list timodoro-list--breakdown';
    breakdownList.dataset.role = 'timodoro-breakdown';

    snapshotCard.append(stats, breakdownList);

    const summaryCard = createCard('Summary Stats', 'Totals for today’s push.');
    const summaryList = document.createElement('ul');
    summaryList.className = 'timodoro-list timodoro-list--stats';
    summaryList.dataset.role = 'timodoro-stats';
    summaryCard.appendChild(summaryList);

    summaryColumn.append(snapshotCard, summaryCard);

    grid.append(taskColumn, summaryColumn);
    root.append(header, grid);
    body.appendChild(root);

    elements = {
      root,
      completedLists,
      recurringList,
      breakdownList,
      summaryList,
      availableValue,
      spentValue
    };
    return elements;
  }

  elements = {
    root,
    completedLists: {
      hustles: root.querySelector('[data-role="timodoro-completed-hustles"]'),
      education: root.querySelector('[data-role="timodoro-completed-education"]'),
      upkeep: root.querySelector('[data-role="timodoro-completed-upkeep"]'),
      upgrades: root.querySelector('[data-role="timodoro-completed-upgrades"]')
    },
    recurringList: root.querySelector('[data-role="timodoro-recurring"]'),
    breakdownList: root.querySelector('[data-role="timodoro-breakdown"]'),
    summaryList: root.querySelector('[data-role="timodoro-stats"]'),
    availableValue: root.querySelector('[data-role="timodoro-hours-available"]'),
    spentValue: root.querySelector('[data-role="timodoro-hours-spent"]')
  };
  return elements;
}

function renderList(list, entries, emptyText) {
  if (!list) return;
  list.innerHTML = '';
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'timodoro-list__empty';
    empty.textContent = emptyText;
    list.appendChild(empty);
    return;
  }

  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'timodoro-list__item';

    const name = document.createElement('span');
    name.className = 'timodoro-list__name';
    name.textContent = entry.name;

    const meta = document.createElement('span');
    meta.className = 'timodoro-list__meta';
    meta.textContent = entry.detail;

    item.append(name, meta);
    list.appendChild(item);
  });
}

function renderCompletedGroups(lists = {}, groupedEntries = {}) {
  const groups = [
    { key: 'hustles', empty: 'No hustles wrapped yet.' },
    { key: 'education', empty: 'No study blocks logged yet.' },
    { key: 'upkeep', empty: 'No upkeep tackled yet.' },
    { key: 'upgrades', empty: 'No upgrade pushes finished yet.' }
  ];

  groups.forEach(({ key, empty }) => {
    const list = lists?.[key];
    const entries = Array.isArray(groupedEntries?.[key]) ? groupedEntries[key] : [];
    renderList(list, entries, empty);
  });
}

function renderBreakdown(list, entries) {
  if (!list) return;
  list.innerHTML = '';
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'timodoro-breakdown__empty';
    empty.textContent = 'No hours tracked yet.';
    list.appendChild(empty);
    return;
  }

  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'timodoro-breakdown__item';

    const label = document.createElement('span');
    label.className = 'timodoro-breakdown__label';
    label.textContent = entry.label;

    const value = document.createElement('span');
    value.className = 'timodoro-breakdown__value';
    value.textContent = entry.value;

    item.append(label, value);
    list.appendChild(item);
  });
}

function renderSummaryStats(list, entries) {
  if (!list) return;
  list.innerHTML = '';
  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'timodoro-stats__item';

    const label = document.createElement('span');
    label.className = 'timodoro-stats__label';
    label.textContent = entry.label;

    const value = document.createElement('span');
    value.className = 'timodoro-stats__value';
    value.textContent = entry.value;

    item.append(label, value);

    if (entry.note) {
      const note = document.createElement('span');
      note.className = 'timodoro-stats__note';
      note.textContent = entry.note;
      item.appendChild(note);
    }

    list.appendChild(item);
  });
}

function normalizeCompletedCategory(category) {
  const label = typeof category === 'string' ? category.toLowerCase() : '';
  if (['study', 'education', 'learning', 'knowledge', 'class'].includes(label)) {
    return 'education';
  }
  if (['maintenance', 'upkeep', 'care', 'support'].includes(label)) {
    return 'upkeep';
  }
  if (['setup', 'upgrade', 'investment', 'build', 'construction', 'improvement'].includes(label)) {
    return 'upgrades';
  }
  return 'hustles';
}

function buildCompletedGroups(summary = {}) {
  const presentations = buildSummaryPresentations(summary);
  const timeEntries = Array.isArray(presentations.timeEntries) ? presentations.timeEntries : [];
  const groups = {
    hustles: [],
    education: [],
    upkeep: [],
    upgrades: []
  };

  timeEntries.forEach(entry => {
    if (!entry) return;
    const bucket = normalizeCompletedCategory(entry.category);
    const hours = Math.max(0, Number(entry.hours) || 0);
    if (hours <= 0) return;
    const detail = `${formatHours(hours)} logged`;
    groups[bucket].push({
      name: entry.label,
      detail
    });
  });

  return groups;
}

function buildRecurringEntries(summary = {}) {
  const presentations = buildSummaryPresentations(summary);
  const timeEntries = Array.isArray(presentations.timeEntries) ? presentations.timeEntries : [];
  const studyEntries = Array.isArray(presentations.studyEntries) ? presentations.studyEntries : [];

  const maintenance = timeEntries
    .filter(entry => entry && entry.category === 'maintenance')
    .map(entry => ({
      name: entry.label,
      detail: `${formatHours(entry.hours)} logged today • Maintenance`
    }));

  const study = studyEntries.map(entry => ({
    name: entry.label,
    detail: entry.value
  }));

  return [...maintenance, ...study];
}

function buildSummaryEntries(summary = {}, todoModel = {}, state = {}) {
  const totalHours = Math.max(0, Number(summary?.totalTime) || 0);
  const activeEarnings = Math.max(0, Number(summary?.activeEarnings) || 0);
  const passiveEarnings = Math.max(0, Number(summary?.passiveEarnings) || 0);
  const totalEarnings = Math.max(0, Number(summary?.totalEarnings) || 0);
  const timeCap = computeTimeCap(state);
  const hoursAvailable = Number.isFinite(todoModel?.hoursAvailable)
    ? Math.max(0, todoModel.hoursAvailable)
    : Math.max(0, Number(state?.timeLeft) || 0);
  const hoursSpent = Math.max(0, timeCap - hoursAvailable);
  const percentUsed = timeCap > 0 ? Math.min(100, Math.round((hoursSpent / timeCap) * 100)) : 0;

  return [
    {
      label: 'Hours logged',
      value: formatHours(totalHours),
      note: totalHours > 0 ? 'Across all workstreams today.' : 'No focus hours logged yet.'
    },
    {
      label: 'Earnings today',
      value: formatCurrency(totalEarnings),
      note: totalEarnings > 0
        ? `${formatCurrency(activeEarnings)} active • ${formatCurrency(passiveEarnings)} passive`
        : 'Ship a gig to see cash roll in.'
    },
    {
      label: 'Time used',
      value: `${percentUsed}%`,
      note: timeCap > 0
        ? `${formatHours(hoursSpent)} of ${formatHours(timeCap)} booked.`
        : 'Daily cap not set yet.'
    }
  ];
}

function buildBreakdown(summary = {}, todoModel = {}, state = {}) {
  const totalHours = Math.max(0, Number(summary?.totalTime) || 0);
  const maintenance = Math.max(0, Number(summary?.maintenanceHours) || 0);
  const active = Math.max(0, totalHours - maintenance);
  const hoursAvailable = Number.isFinite(todoModel?.hoursAvailable)
    ? Math.max(0, todoModel.hoursAvailable)
    : Math.max(0, Number(state?.timeLeft) || 0);

  return [
    { label: 'Active work', value: formatHours(active) },
    { label: 'Upkeep & care', value: formatHours(maintenance) },
    { label: 'Hours remaining', value: formatHours(hoursAvailable) }
  ];
}

function buildMeta(summary = {}, completedGroups = {}) {
  const totalHours = Math.max(0, Number(summary?.totalTime) || 0);
  const totalEarnings = Math.max(0, Number(summary?.totalEarnings) || 0);
  const taskCount = Object.values(completedGroups || {}).reduce((total, group) => {
    if (!Array.isArray(group)) return total;
    return total + group.length;
  }, 0);
  const parts = [];
  if (taskCount > 0) {
    parts.push(`${taskCount} task${taskCount === 1 ? '' : 's'} logged`);
  }
  if (totalHours > 0) {
    parts.push(`${formatHours(totalHours)} logged`);
  }
  if (totalEarnings > 0) {
    parts.push(`${formatCurrency(totalEarnings)} earned`);
  }
  return parts.length ? parts.join(' • ') : 'No hustle data yet.';
}

export default function renderTimodoro(context = {}) {
  const page = getPageByType('timodoro');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    ensureElements(body);
  });
  if (!refs) return null;

  const dom = ensureElements(refs.body);
  if (!dom) return null;

  const state = getState() || {};
  const summary = computeDailySummary(state);

  const quickActions = buildQuickActionModel(state);
  const assetActions = buildAssetActionModel(state);
  const studyActions = buildStudyEnrollmentActionModel(state);
  const autoEntries = createAutoCompletedEntries(summary);
  const todoModel = composeTodoModel(quickActions, assetActions, studyActions, autoEntries);

  const completedGroups = buildCompletedGroups(summary);
  const recurringEntries = buildRecurringEntries(summary);
  const summaryEntries = buildSummaryEntries(summary, todoModel, state);
  const breakdownEntries = buildBreakdown(summary, todoModel, state);

  if (dom.availableValue) {
    const availableLabel = todoModel?.hoursAvailableLabel
      || formatHours(Number(todoModel?.hoursAvailable) || Number(state?.timeLeft) || 0);
    dom.availableValue.textContent = availableLabel;
  }
  if (dom.spentValue) {
    const hoursSpent = Number.isFinite(todoModel?.hoursSpent)
      ? Math.max(0, todoModel.hoursSpent)
      : Math.max(0, computeTimeCap(state) - (Number(state?.timeLeft) || 0));
    dom.spentValue.textContent = formatHours(hoursSpent);
  }

  renderBreakdown(dom.breakdownList, breakdownEntries);
  renderCompletedGroups(dom.completedLists, completedGroups);
  renderList(dom.recurringList, recurringEntries, 'No upkeep logged yet. Assistants will report here.');
  renderSummaryStats(dom.summaryList, summaryEntries);

  const meta = buildMeta(summary, completedGroups);
  return { id: page.id, meta };
}
