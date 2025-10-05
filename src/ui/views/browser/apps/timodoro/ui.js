import { appendContent } from '../../components/common/domHelpers.js';
import { createStat } from '../../components/widgets.js';
import { getWorkspacePath } from '../../layout/workspaces.js';
import { formatCurrency } from './model.js';
import { createCard } from './components/card.js';
import {
  createBreakdownList,
  createSummaryList,
  createTaskList
} from './components/lists.js';
import { createCompletedSection } from './sections/completedSection.js';

const tabObserverMap = new WeakMap();

const TODO_GROUPS = [
  { key: 'hustle', label: 'Hustles queued', empty: 'Line up a gig to stack this lane.' },
  { key: 'upgrade', label: 'Upgrades to trigger', empty: 'Queue an upgrade to keep momentum.' },
  { key: 'study', label: 'Study & training', empty: 'No study blocks queued yet.' },
  { key: 'other', label: 'Assist & extras', empty: 'No support tasks waiting on you.' }
];

function buildTodoGroups(entries = []) {
  const groups = TODO_GROUPS.reduce((map, group) => {
    map[group.key] = [];
    return map;
  }, {});

  entries
    .filter(Boolean)
    .forEach((entry, index) => {
      const detailParts = [];
      if (entry.durationText) {
        detailParts.push(entry.durationText);
      }
      const focus = typeof entry.focusCategory === 'string' ? entry.focusCategory.toLowerCase() : '';
      if (entry.meta && focus !== 'upgrade') {
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

      let groupKey = focus;
      if (groupKey === 'education') {
        groupKey = 'study';
      }
      if (!groupKey) {
        groupKey = 'hustle';
      }
      if (!groups[groupKey]) {
        groupKey = 'other';
      }

      const item = {
        name: entry.title || entry.name || `Task ${index + 1}`
      };

      if (groupKey !== 'study' && detailParts.length > 0) {
        item.detail = detailParts.join(' • ');
      }

      groups[groupKey].push(item);
    });

  return groups;
}

function createTodoCard(model = {}, options = {}) {
  const { navigation } = options;
  const card = createCard({
    title: 'ToDo',
    headerClass: navigation ? 'browser-card__header--stacked' : undefined,
    headerContent: navigation || null
  });

  const entries = Array.isArray(model.todoEntries) ? model.todoEntries : [];
  const groups = buildTodoGroups(entries);
  const totalTasks = TODO_GROUPS.reduce((total, config) => total + (groups[config.key]?.length || 0), 0);

  if (totalTasks === 0) {
    const emptyText = model.todoEmptyMessage || 'Queue a hustle or upgrade to add new tasks.';
    card.appendChild(createTaskList([], emptyText, 'timodoro-todo'));
    return card;
  }

  const section = document.createElement('section');
  section.className = 'timodoro-section';

  const heading = document.createElement('h3');
  heading.className = 'timodoro-section__title';
  appendContent(heading, 'Up next');
  section.appendChild(heading);

  const groupsWrapper = document.createElement('div');
  groupsWrapper.className = 'timodoro-section__groups';

  TODO_GROUPS.forEach(config => {
    const group = document.createElement('section');
    group.className = 'timodoro-subsection';

    const title = document.createElement('h4');
    title.className = 'timodoro-subsection__title';
    appendContent(title, config.label);

    const items = groups[config.key] || [];
    const emptyMessage = config.key === 'hustle' ? (model.todoEmptyMessage || config.empty) : config.empty;
    const list = createTaskList(items, emptyMessage, `timodoro-todo-${config.key}`);

    group.append(title, list);
    groupsWrapper.appendChild(group);
  });

  section.appendChild(groupsWrapper);
  card.appendChild(section);

  return card;
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
  { key: 'todo', label: 'ToDo', buttonId: 'timodoro-tab-todo', panelId: 'timodoro-tabpanel-todo' },
  { key: 'done', label: 'Done', buttonId: 'timodoro-tab-done', panelId: 'timodoro-tabpanel-done' }
];

const DEFAULT_TAB_KEY = TAB_CONFIGS[0].key;

function getTabConfig(key) {
  return TAB_CONFIGS.find(config => config.key === key) || null;
}

function normalizeTabKey(key) {
  const config = getTabConfig(key);
  return config ? config.key : DEFAULT_TAB_KEY;
}

function deriveTabFromPath(path = '') {
  if (!path) {
    return DEFAULT_TAB_KEY;
  }
  const [segment] = String(path)
    .split('/')
    .filter(Boolean);
  return normalizeTabKey(segment);
}

function buildTabPath(key) {
  return normalizeTabKey(key);
}

function syncTabFromPath(tabs, path) {
  if (!tabs || typeof tabs.activate !== 'function') {
    return;
  }
  const nextTab = deriveTabFromPath(path);
  tabs.activate(nextTab, { notify: false });
}

function observePagePath(mount, tabs) {
  if (!mount || !tabs || typeof MutationObserver !== 'function') {
    return;
  }

  const existing = tabObserverMap.get(mount);
  if (existing) {
    existing.disconnect?.();
    tabObserverMap.delete(mount);
  }

  const pageElement = mount.closest('[data-browser-page]');
  if (!pageElement) {
    return;
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-browser-path') {
        syncTabFromPath(tabs, pageElement.dataset.browserPath || '');
      }
    }
  });

  try {
    observer.observe(pageElement, { attributes: true, attributeFilter: ['data-browser-path'] });
    tabObserverMap.set(mount, observer);
  } catch (error) {
    observer.disconnect();
    return;
  }

  syncTabFromPath(tabs, pageElement.dataset.browserPath || '');
}

function createTodoPanel(model = {}, config = TAB_CONFIGS[0], options = {}) {
  const { navigation, labelId } = options;
  const panel = document.createElement('div');
  panel.className = 'timodoro-tabs__panel';
  panel.dataset.tab = config.key;
  panel.id = config.panelId;
  panel.hidden = true;
  panel.setAttribute('aria-hidden', 'true');
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', labelId || config.buttonId);

  panel.appendChild(createTodoCard(model, { navigation }));
  return panel;
}

function createDonePanel(model = {}, config = TAB_CONFIGS[1], options = {}) {
  const { navigation, labelId } = options;
  const panel = document.createElement('div');
  panel.className = 'timodoro-tabs__panel';
  panel.dataset.tab = config.key;
  panel.id = config.panelId;
  panel.hidden = true;
  panel.setAttribute('aria-hidden', 'true');
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', labelId || config.buttonId);

  const taskCard = createCard({
    title: 'Done',
    summary: 'Celebrate today’s finished focus blocks.',
    headerClass: navigation ? 'browser-card__header--stacked' : undefined,
    headerContent: navigation || null
  });
  taskCard.appendChild(createCompletedSection(model.completedGroups));

  panel.append(taskCard, createRecurringCard(model));
  return panel;
}

function createTabButton(config, onSelect, options = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'timodoro-tabs__button';
  const buttonId = options.id || config.buttonId;
  if (buttonId) {
    button.id = buttonId;
  }
  button.setAttribute('role', 'tab');
  button.setAttribute('aria-controls', config.panelId);
  button.setAttribute('aria-selected', 'false');
  button.tabIndex = -1;
  appendContent(button, config.label);
  button.addEventListener('click', () => onSelect(config.key));
  return button;
}

function createTabs(model = {}, options = {}) {
  const { initialTab = DEFAULT_TAB_KEY, onSelect } = options;

  const wrapper = document.createElement('section');
  wrapper.className = 'timodoro-tabs';

  const panels = document.createElement('div');
  panels.className = 'timodoro-tabs__panels';

  const panelRefs = new Map();
  const navigationSets = [];

  let currentTab = null;
  let activateTab;

  const notifySelect = key => {
    if (typeof onSelect === 'function') {
      onSelect(key);
    }
  };

  const registerNavigation = buttons => {
    if (buttons instanceof Map) {
      navigationSets.push(buttons);
    }
  };

  const setButtonState = (button, active) => {
    if (!button) {
      return;
    }
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
    button.tabIndex = active ? 0 : -1;
  };

  const updateNavigationState = targetKey => {
    navigationSets.forEach(buttons => {
      buttons.forEach((button, tabKey) => {
        setButtonState(button, tabKey === targetKey);
      });
    });
  };

  const handleButtonSelect = key => {
    if (typeof activateTab === 'function') {
      activateTab(key);
    }
  };

  const buildButtonId = (config, suffix) => {
    if (!config || !config.buttonId) {
      return config?.buttonId;
    }
    return suffix ? `${config.buttonId}-${suffix}` : config.buttonId;
  };

  const buildNavigation = (idSuffix, extraClassName) => {
    const nav = document.createElement('div');
    nav.className = ['timodoro-tabs__nav', extraClassName].filter(Boolean).join(' ');
    nav.setAttribute('role', 'tablist');

    const buttons = new Map();

    TAB_CONFIGS.forEach(config => {
      const buttonId = buildButtonId(config, idSuffix);
      const button = createTabButton(config, handleButtonSelect, { id: buttonId });
      buttons.set(config.key, button);
      nav.appendChild(button);
    });

    registerNavigation(buttons);

    return { nav, buttons };
  };

  activateTab = (key, { notify = true } = {}) => {
    const targetKey = normalizeTabKey(key);
    if (currentTab === targetKey && notify) {
      notifySelect(targetKey);
      return currentTab;
    }

    updateNavigationState(targetKey);

    panelRefs.forEach((panel, tabKey) => {
      const active = tabKey === targetKey;
      if (panel) {
        panel.hidden = !active;
        panel.setAttribute('aria-hidden', active ? 'false' : 'true');
      }
    });

    currentTab = targetKey;
    if (notify) {
      notifySelect(targetKey);
    }

    return currentTab;
  };

  TAB_CONFIGS.forEach(config => {
    const idSuffix = config.key;
    const { nav } = buildNavigation(idSuffix, 'timodoro-tabs__nav--inline');
    const panelOptions = {
      navigation: nav,
      labelId: buildButtonId(config, idSuffix)
    };
    const panel = config.key === 'done'
      ? createDonePanel(model, config, panelOptions)
      : createTodoPanel(model, config, panelOptions);
    panelRefs.set(config.key, panel);
    panels.appendChild(panel);
  });

  wrapper.appendChild(panels);

  activateTab(initialTab, { notify: false });

  return {
    root: wrapper,
    activate: (key, options) => activateTab(key, options),
    getActive: () => currentTab
  };
}

function createTaskColumn(model = {}, options = {}) {
  const column = document.createElement('div');
  column.className = 'timodoro__column timodoro__column--tasks';

  const tabs = createTabs(model, options);
  column.appendChild(tabs.root);

  return { column, tabs };
}

function createLayout(model = {}, options = {}) {
  const fragment = document.createDocumentFragment();

  const grid = document.createElement('div');
  grid.className = 'timodoro__grid';

  const { column, tabs } = createTaskColumn(model, options);

  grid.append(column, createSummaryColumn(model));
  fragment.appendChild(grid);

  return { fragment, tabs };
}

function render(model = {}, context = {}) {
  const { mount, page, onRouteChange } = context;
  const summary = { meta: model?.meta || 'Productivity ready' };

  const resolveInitialTab = () => {
    if (!page || typeof getWorkspacePath !== 'function') {
      return DEFAULT_TAB_KEY;
    }
    try {
      const path = getWorkspacePath(page.id);
      return deriveTabFromPath(path);
    } catch (error) {
      return DEFAULT_TAB_KEY;
    }
  };

  const initialTab = resolveInitialTab();

  if (!mount) {
    summary.urlPath = buildTabPath(initialTab);
    return summary;
  }

  mount.innerHTML = '';
  mount.className = 'timodoro';
  mount.dataset.role = mount.dataset.role || 'timodoro-root';

  const { fragment, tabs } = createLayout(model, {
    initialTab,
    onSelect: key => {
      if (typeof onRouteChange === 'function') {
        onRouteChange(buildTabPath(key));
      }
    }
  });

  mount.appendChild(fragment);

  const activeTab = tabs.getActive?.() || initialTab;
  summary.urlPath = buildTabPath(activeTab);

  observePagePath(mount, tabs);

  return summary;
}

export { render };
export default { render };
