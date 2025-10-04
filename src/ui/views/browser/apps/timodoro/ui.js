import { createStat } from '../../components/widgets.js';

let elements = null;

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

export function ensureElements(body) {
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

export function renderView(dom, viewModel = {}) {
  if (!dom) return;
  const {
    completedGroups = {},
    recurringEntries = [],
    summaryEntries = [],
    breakdownEntries = [],
    hoursAvailableLabel = '0h',
    hoursSpentLabel = '0h',
    recurringEmpty = 'No upkeep logged yet. Assistants will report here.'
  } = viewModel;

  if (dom.availableValue) {
    dom.availableValue.textContent = hoursAvailableLabel;
  }
  if (dom.spentValue) {
    dom.spentValue.textContent = hoursSpentLabel;
  }

  renderBreakdown(dom.breakdownList, breakdownEntries);
  renderCompletedGroups(dom.completedLists, completedGroups);
  renderList(dom.recurringList, recurringEntries, recurringEmpty);
  renderSummaryStats(dom.summaryList, summaryEntries);
}
