import { appendContent } from '../../components/common/domHelpers.js';
import { createStat } from '../../components/widgets.js';
import { formatCurrency } from './model.js';

const COMPLETED_GROUPS = [
  { key: 'hustles', label: 'Hustles', empty: 'No hustles wrapped yet.' },
  { key: 'education', label: 'Education', empty: 'No study blocks logged yet.' },
  { key: 'upkeep', label: 'Upkeep', empty: 'No upkeep tackled yet.' },
  { key: 'upgrades', label: 'Upgrades', empty: 'No upgrade pushes finished yet.' }
];

function createCard({ title, summary }) {
  const card = document.createElement('article');
  card.className = 'browser-card timodoro-card';

  const header = document.createElement('header');
  header.className = 'browser-card__header';

  const heading = document.createElement('h2');
  heading.className = 'browser-card__title';
  appendContent(heading, title);
  header.appendChild(heading);

  if (summary) {
    const description = document.createElement('p');
    description.className = 'browser-card__summary';
    appendContent(description, summary);
    header.appendChild(description);
  }

  card.appendChild(header);
  return card;
}

function createEmptyItem(className, message) {
  const empty = document.createElement('li');
  empty.className = className;
  appendContent(empty, message);
  return empty;
}

function createTaskList(entries = [], emptyText, datasetKey) {
  const list = document.createElement('ul');
  list.className = 'timodoro-list timodoro-list--tasks';
  if (datasetKey) {
    list.dataset.role = datasetKey;
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    list.appendChild(createEmptyItem('timodoro-list__empty', emptyText));
    return list;
  }

  entries.forEach(entry => {
    if (!entry) return;
    const item = document.createElement('li');
    item.className = 'timodoro-list__item';

    const name = document.createElement('span');
    name.className = 'timodoro-list__name';
    appendContent(name, entry.name ?? '');

    const meta = document.createElement('span');
    meta.className = 'timodoro-list__meta';
    appendContent(meta, entry.detail ?? '');

    item.append(name, meta);
    list.appendChild(item);
  });

  return list;
}

function buildTodoItems(entries = []) {
  return entries
    .filter(Boolean)
    .map((entry, index) => {
      const detailParts = [];
      if (entry.durationText) {
        detailParts.push(entry.durationText);
      }
      if (entry.meta) {
        detailParts.push(entry.meta);
      }
      const moneyCost = Number(entry.moneyCost);
      if (Number.isFinite(moneyCost) && Math.abs(moneyCost) > 1e-4) {
        detailParts.push(`Cost ${formatCurrency(Math.abs(moneyCost))}`);
      }
      const runsRemaining = Number(entry.remainingRuns ?? entry.upgradeRemaining);
      if (Number.isFinite(runsRemaining) && runsRemaining > 0) {
        detailParts.push(`Runs left ×${runsRemaining}`);
      }

      return {
        name: entry.title || entry.name || `Task ${index + 1}`,
        detail: detailParts.join(' • ')
      };
    });
}

function createTodoCard(model = {}) {
  const card = createCard({
    title: 'Todo Queue',
    summary: 'Pull your next focus block straight from the backlog.'
  });

  const items = buildTodoItems(Array.isArray(model.todoEntries) ? model.todoEntries : []);
  const emptyText = model.todoEmptyMessage || 'Queue a hustle or upgrade to add new tasks.';
  card.appendChild(createTaskList(items, emptyText, 'timodoro-todo'));

  return card;
}

function createCompletedSection(completedGroups = {}) {
  const section = document.createElement('section');
  section.className = 'timodoro-section';

  const heading = document.createElement('h3');
  heading.className = 'timodoro-section__title';
  appendContent(heading, 'Completed today');

  const groupsWrapper = document.createElement('div');
  groupsWrapper.className = 'timodoro-section__groups';

  COMPLETED_GROUPS.forEach(groupConfig => {
    const group = document.createElement('section');
    group.className = 'timodoro-subsection';

    const title = document.createElement('h4');
    title.className = 'timodoro-subsection__title';
    appendContent(title, groupConfig.label);

    const entries = Array.isArray(completedGroups[groupConfig.key])
      ? completedGroups[groupConfig.key]
      : [];
    const list = createTaskList(entries, groupConfig.empty, `timodoro-completed-${groupConfig.key}`);

    group.append(title, list);
    groupsWrapper.appendChild(group);
  });

  section.append(heading, groupsWrapper);
  return section;
}

function createRecurringCard(model = {}) {
  const card = createCard({
    title: 'Recurring / Assistant Work',
    summary: 'Upkeep, maintenance, and study sessions auto-logged for you.'
  });

  const list = createTaskList(
    Array.isArray(model.recurringEntries) ? model.recurringEntries : [],
    model.recurringEmpty || 'No upkeep logged yet. Assistants will report here.',
    'timodoro-recurring'
  );

  card.appendChild(list);
  return card;
}

function createBreakdownList(entries = []) {
  const list = document.createElement('ul');
  list.className = 'timodoro-list timodoro-list--breakdown';
  list.dataset.role = 'timodoro-breakdown';

  if (!Array.isArray(entries) || entries.length === 0) {
    list.appendChild(createEmptyItem('timodoro-breakdown__empty', 'No hours tracked yet.'));
    return list;
  }

  entries.forEach(entry => {
    if (!entry) return;
    const item = document.createElement('li');
    item.className = 'timodoro-breakdown__item';

    const label = document.createElement('span');
    label.className = 'timodoro-breakdown__label';
    appendContent(label, entry.label ?? '');

    const value = document.createElement('span');
    value.className = 'timodoro-breakdown__value';
    appendContent(value, entry.value ?? '');

    item.append(label, value);
    list.appendChild(item);
  });

  return list;
}

function createSummaryList(entries = []) {
  const list = document.createElement('ul');
  list.className = 'timodoro-list timodoro-list--stats';
  list.dataset.role = 'timodoro-stats';

  if (!Array.isArray(entries) || entries.length === 0) {
    return list;
  }

  entries.forEach(entry => {
    if (!entry) return;
    const item = document.createElement('li');
    item.className = 'timodoro-stats__item';

    const label = document.createElement('span');
    label.className = 'timodoro-stats__label';
    appendContent(label, entry.label ?? '');

    const value = document.createElement('span');
    value.className = 'timodoro-stats__value';
    appendContent(value, entry.value ?? '');

    item.append(label, value);

    if (entry.note) {
      const note = document.createElement('span');
      note.className = 'timodoro-stats__note';
      appendContent(note, entry.note);
      item.appendChild(note);
    }

    list.appendChild(item);
  });

  return list;
}

function createSnapshotCard(model = {}) {
  const card = createCard({
    title: 'Today’s Snapshot',
    summary: 'Where your hustle hours landed.'
  });

  const stats = document.createElement('div');
  stats.className = 'browser-card__stats';

  const availableLabel = model.hoursAvailableLabel || '0h';
  const spentLabel = model.hoursSpentLabel || '0h';

  const availableStat = createStat('Hours available', availableLabel);
  const availableValue = availableStat.querySelector('.browser-card__stat-value');
  if (availableValue) {
    availableValue.dataset.role = 'timodoro-hours-available';
  }

  const spentStat = createStat('Hours spent', spentLabel);
  const spentValue = spentStat.querySelector('.browser-card__stat-value');
  if (spentValue) {
    spentValue.dataset.role = 'timodoro-hours-spent';
  }

  stats.append(availableStat, spentStat);

  const breakdown = createBreakdownList(Array.isArray(model.breakdownEntries) ? model.breakdownEntries : []);

  card.append(stats, breakdown);
  return card;
}

function createSummaryColumn(model = {}) {
  const column = document.createElement('div');
  column.className = 'timodoro__column timodoro__column--summary';

  column.append(
    createSnapshotCard(model),
    (() => {
      const card = createCard({
        title: 'Summary Stats',
        summary: 'Totals for today’s push.'
      });
      card.appendChild(createSummaryList(Array.isArray(model.summaryEntries) ? model.summaryEntries : []));
      return card;
    })()
  );

  return column;
}

const TAB_CONFIGS = [
  { key: 'todo', label: 'TODO', buttonId: 'timodoro-tab-todo', panelId: 'timodoro-tabpanel-todo' },
  { key: 'done', label: 'DONE', buttonId: 'timodoro-tab-done', panelId: 'timodoro-tabpanel-done' }
];

function createTodoPanel(model = {}, config = TAB_CONFIGS[0]) {
  const panel = document.createElement('div');
  panel.className = 'timodoro-tabs__panel';
  panel.dataset.tab = config.key;
  panel.id = config.panelId;
  panel.hidden = true;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', config.buttonId);

  panel.appendChild(createTodoCard(model));
  return panel;
}

function createDonePanel(model = {}, config = TAB_CONFIGS[1]) {
  const panel = document.createElement('div');
  panel.className = 'timodoro-tabs__panel';
  panel.dataset.tab = config.key;
  panel.id = config.panelId;
  panel.hidden = true;
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', config.buttonId);

  const taskCard = createCard({
    title: 'Task Log',
    summary: 'Celebrate today’s finished focus blocks.'
  });
  taskCard.appendChild(createCompletedSection(model.completedGroups));

  panel.append(taskCard, createRecurringCard(model));
  return panel;
}

function createTabButton(config, onSelect) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'timodoro-tabs__button';
  button.id = config.buttonId;
  button.setAttribute('role', 'tab');
  button.setAttribute('aria-controls', config.panelId);
  button.setAttribute('aria-selected', 'false');
  appendContent(button, config.label);
  button.addEventListener('click', () => onSelect(config.key));
  return button;
}

function createTabs(model = {}) {
  const wrapper = document.createElement('section');
  wrapper.className = 'timodoro-tabs';

  const nav = document.createElement('div');
  nav.className = 'timodoro-tabs__nav';
  nav.setAttribute('role', 'tablist');

  const panels = document.createElement('div');
  panels.className = 'timodoro-tabs__panels';

  const buttons = new Map();
  const panelRefs = new Map();

  const handleSelect = key => {
    buttons.forEach((button, tabKey) => {
      const active = tabKey === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      const panel = panelRefs.get(tabKey);
      if (panel) {
        panel.hidden = !active;
      }
    });
  };

  TAB_CONFIGS.forEach(config => {
    const button = createTabButton(config, handleSelect);
    buttons.set(config.key, button);
    nav.appendChild(button);

    const panel = config.key === 'done'
      ? createDonePanel(model, config)
      : createTodoPanel(model, config);
    panelRefs.set(config.key, panel);
    panels.appendChild(panel);
  });

  wrapper.append(nav, panels);

  return { root: wrapper, activate: handleSelect };
}

function createTaskColumn(model = {}) {
  const column = document.createElement('div');
  column.className = 'timodoro__column timodoro__column--tasks';

  const tabs = createTabs(model);
  column.appendChild(tabs.root);
  tabs.activate('todo');

  return column;
}

function createLayout(model = {}) {
  const fragment = document.createDocumentFragment();

  const grid = document.createElement('div');
  grid.className = 'timodoro__grid';

  grid.append(createTaskColumn(model), createSummaryColumn(model));
  fragment.appendChild(grid);

  return fragment;
}

function render(model = {}, context = {}) {
  const { mount } = context;
  const summary = { meta: model?.meta || 'Productivity ready' };

  if (!mount) {
    return summary;
  }

  mount.innerHTML = '';
  mount.className = 'timodoro';
  mount.dataset.role = mount.dataset.role || 'timodoro-root';
  mount.appendChild(createLayout(model));

  return summary;
}

export { render };
export default { render };
