import { appendContent } from '../../components/common/domHelpers.js';
import { getWorkspacePath } from '../../layout/workspaces.js';
import { createCard } from './components/card.js';
import { createCompletedSection } from './sections/completedSection.js';
import { buildTimelineModel, renderTimeline, teardownTimeline } from '../../widgets/todoTimeline.js';
import { buildTodoGroups, createTodoCard } from './sections/todoSection.js';
import { createRecurringCard } from './sections/recurringSection.js';
import { createSummaryColumn } from './sections/summarySection.js';

const tabObserverMap = new WeakMap();

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
  const { navigation, labelId, todoGroups } = options;
  const panel = document.createElement('div');
  panel.className = 'timodoro-tabs__panel';
  panel.dataset.tab = config.key;
  panel.id = config.panelId;
  panel.hidden = true;
  panel.setAttribute('aria-hidden', 'true');
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', labelId || config.buttonId);

  panel.appendChild(createTodoCard(model, { navigation, todoGroups }));
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
    title: 'Wins logged',
    summary: 'Celebrate freshly cleared focus blocks.',
    headerClass: navigation ? 'browser-card__header--stacked' : undefined,
    headerContent: navigation || null
  });
  taskCard.appendChild(createCompletedSection(model.completedGroups));

  panel.append(taskCard, createRecurringCard(model));
  return panel;
}

function createTimelineCard(model = {}, options = {}) {
  const { pendingEntries = [], onRun } = options;
  const card = createCard({
    title: 'Daily timeline',
    summary: 'Map today’s hustle arc from warm-up to wrap-up.'
  });
  card.classList.add('timodoro-timeline-card');

  const container = document.createElement('div');
  container.className = 'todo-widget__timeline';
  container.dataset.role = 'timodoro-timeline';
  container.setAttribute('aria-label', 'Daily flow timeline');

  const timelineModel = buildTimelineModel({
    viewModel: { hoursSpent: model?.hoursSpent },
    pendingEntries,
    completedEntries: Array.isArray(model?.timelineCompletedEntries)
      ? model.timelineCompletedEntries
      : [],
    now: new Date()
  });

  const runHandler = typeof onRun === 'function'
    ? onRun
    : entry => {
        if (entry && typeof entry.onClick === 'function') {
          entry.onClick();
        }
      };

  renderTimeline(container, timelineModel, {
    onRun: runHandler
  });

  card.appendChild(container);
  return card;
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
  const { initialTab = DEFAULT_TAB_KEY, onSelect, todoGroups } = options;

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
      labelId: buildButtonId(config, idSuffix),
      todoGroups
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

  const entries = Array.isArray(model.todoEntries) ? model.todoEntries : [];
  const todoGroups = buildTodoGroups(entries, {
    availableHours: model.todoHoursAvailable ?? model.hoursAvailable,
    availableMoney: model.todoMoneyAvailable ?? model.moneyAvailable,
    emptyMessage: model.todoEmptyMessage
  });

  fragment.appendChild(createTimelineCard(model, {
    pendingEntries: todoGroups?.grouping?.entries || [],
    onRun: options.onRun
  }));

  const grid = document.createElement('div');
  grid.className = 'timodoro__grid';

  const { column, tabs } = createTaskColumn(model, { ...options, todoGroups });

  grid.append(column, createSummaryColumn(model));
  fragment.appendChild(grid);

  return { fragment, tabs, todoGroups };
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

  const previousTimeline = mount.querySelector?.('[data-role="timodoro-timeline"]');
  if (previousTimeline) {
    teardownTimeline(previousTimeline);
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
