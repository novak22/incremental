import { getElement } from '../elements/registry.js';
import { buildLayoutModel, getLayoutPreferences, updateLayoutPreferences } from './model.js';
import { getActiveView } from '../viewManager.js';
import classicLayoutPresenter from '../views/classic/layoutPresenter.js';

let activePanelController = null;
let currentCardModels = null;
let layoutPresenterInitialized = false;
let presenterRef = null;

function syncPreferencesFromDom() {
  const hustleControls = getElement('hustleControls') || {};
  if (hustleControls.hustleAvailableToggle || hustleControls.hustleSort || hustleControls.hustleSearch) {
    updateLayoutPreferences('hustles', {
      availableOnly: Boolean(hustleControls.hustleAvailableToggle?.checked),
      sort: hustleControls.hustleSort?.value,
      query: hustleControls.hustleSearch?.value ?? ''
    });
  }

  const assetFilters = getElement('assetFilters') || {};
  if (assetFilters.activeOnly || assetFilters.maintenance || assetFilters.lowRisk) {
    updateLayoutPreferences('assets', {
      activeOnly: Boolean(assetFilters.activeOnly?.checked),
      maintenanceOnly: Boolean(assetFilters.maintenance?.checked),
      hideHighRisk: Boolean(assetFilters.lowRisk?.checked)
    });
  }

  const upgradeFilters = getElement('upgradeFilters') || {};
  if (upgradeFilters.unlocked) {
    updateLayoutPreferences('upgrades', { readyOnly: upgradeFilters.unlocked.checked !== false });
  }

  const studyFilters = getElement('studyFilters') || {};
  if (studyFilters.activeOnly || studyFilters.hideComplete) {
    updateLayoutPreferences('study', {
      activeOnly: Boolean(studyFilters.activeOnly?.checked),
      hideComplete: Boolean(studyFilters.hideComplete?.checked)
    });
  }
}

function emitLayoutEvent(name) {
  if (typeof document?.createEvent === 'function') {
    const event = document.createEvent('Event');
    event.initEvent(name, true, true);
    document.dispatchEvent(event);
    return;
  }
  if (typeof Event === 'function') {
    document.dispatchEvent(new Event(name));
  }
}

function getPresenter() {
  const presenter = getActiveView()?.presenters?.layout;
  return presenter || classicLayoutPresenter;
}

function setupTabs() {
  const { shellTabs = [], panels = [] } = getElement('shellNavigation') || {};
  if (!shellTabs.length || !panels.length) return;

  const activate = targetId => {
    shellTabs.forEach(tab => {
      const isActive = tab.getAttribute('aria-controls') === targetId;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });
    panels.forEach(panel => {
      const match = panel.id === targetId;
      panel.classList.toggle('is-active', match);
      panel.hidden = !match;
    });
  };

  activePanelController = activate;
  shellTabs.forEach(tab => {
    tab.addEventListener('click', () => activate(tab.getAttribute('aria-controls')));
  });
  activate('panel-dashboard');
}

function setupEventLog() {
  const { openEventLog, eventLogPanel, eventLogClose } = getElement('eventLogControls') || {};
  if (!openEventLog || !eventLogPanel) return;

  const toggle = visible => {
    eventLogPanel.hidden = !visible;
    if (visible) {
      eventLogPanel.querySelector('button')?.focus({ preventScroll: true });
    }
  };

  openEventLog.addEventListener('click', () => toggle(true));
  eventLogClose?.addEventListener('click', () => toggle(false));
  eventLogPanel.addEventListener('click', event => {
    if (event.target.dataset.close === 'event-log') {
      toggle(false);
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !eventLogPanel.hidden) {
      toggle(false);
    }
  });
}

function setupSlideOver() {
  const { slideOver, slideOverBackdrop, slideOverClose } = getElement('slideOver') || {};
  if (!slideOver) return;

  const hide = () => {
    slideOver.hidden = true;
    slideOver.dataset.mode = '';
  };

  slideOverBackdrop?.addEventListener('click', hide);
  slideOverClose?.addEventListener('click', hide);
  slideOver.addEventListener('keydown', event => {
    if (event.key === 'Escape') hide();
  });

  document.addEventListener('mousedown', event => {
    if (slideOver.hidden) return;
    const panel = slideOver.querySelector('.slide-over__panel');
    if (panel?.contains(event.target)) return;
    hide();
  });

  slideOver.hidePanel = hide;
}

function setupCommandPalette() {
  const { commandPalette, commandPaletteTrigger, commandPaletteBackdrop, commandPaletteSearch } =
    getElement('commandPalette') || {};
  if (!commandPalette || !commandPaletteTrigger) return;

  const show = () => {
    commandPalette.hidden = false;
    commandPaletteSearch?.focus({ preventScroll: true });
  };

  const hide = () => {
    commandPalette.hidden = true;
    if (commandPaletteSearch) {
      commandPaletteSearch.value = '';
    }
  };

  commandPaletteTrigger.addEventListener('click', show);
  commandPaletteBackdrop?.addEventListener('click', hide);
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      show();
    }
    if (event.key === 'Escape' && !commandPalette.hidden) {
      hide();
    }
  });

  commandPalette.hidePalette = hide;
}

function focusDashboardSection(target) {
  if (!target) return;

  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

  const highlight = target;
  const focusable = highlight.matches('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ? highlight
    : highlight.querySelector('h2, h3, h4, button, [tabindex]:not([tabindex="-1"]), a, input, select, textarea');

  let cleanup;
  if (focusable) {
    focusable.focus({ preventScroll: true });
  } else {
    highlight.setAttribute('tabindex', '-1');
    highlight.focus({ preventScroll: true });
    cleanup = () => highlight.removeAttribute('tabindex');
  }

  highlight.classList.add('is-kpi-highlight');
  window.setTimeout(() => highlight.classList.remove('is-kpi-highlight'), 1400);

  if (cleanup) {
    window.setTimeout(cleanup, 700);
  }
}

function setupKpiShortcuts() {
  const buttons = Object.values(getElement('kpis') || {}).filter(Boolean);
  if (!buttons.length) return;

  const dailyStats = getElement('dailyStats') || {};
  const notifications = getElement('notifications');
  const assetUpgradeActions = getElement('assetUpgradeActions');
  const sessionStatus = getElement('sessionStatus');

  const targetLookup = {
    cash: () => dailyStats.earningsActive?.closest('.daily-stats__section')
      || dailyStats.earningsActive
      || dailyStats.earningsSummary,
    net: () => dailyStats.spendList?.closest('.daily-stats__section')
      || dailyStats.spendList
      || dailyStats.spendSummary,
    time: () => dailyStats.timeList?.closest('.daily-stats__section')
      || dailyStats.timeList
      || dailyStats.timeSummary,
    upkeep: () => notifications?.closest?.('.dashboard-card') || notifications,
    assets: () => assetUpgradeActions?.closest?.('.dashboard-card') || assetUpgradeActions,
    study: () => dailyStats.studyList?.closest('.daily-stats__section')
      || dailyStats.studyList
      || dailyStats.studySummary
  };

  const statusMessages = {
    cash: 'Scooting to the daily earnings breakdown.',
    net: 'Reviewing how today’s inflows and outflows balance.',
    time: 'Hopping down to the time ledger for today.',
    upkeep: 'Checking upkeep reminders and notifications.',
    assets: 'Spotlighting active ventures and upgrade prospects.',
    study: 'Beaming over to the study progress section.'
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const detail = button.dataset.detail;
      const target = targetLookup[detail]?.();
      if (!target) return;

      focusDashboardSection(target);
      const message = statusMessages[detail];
      if (message && sessionStatus) {
        sessionStatus.textContent = message;
      }
    });
  });
}

function initializeLayoutPresenter() {
  const presenter = getPresenter();
  if (!presenter?.initControls) {
    return;
  }
  if (layoutPresenterInitialized && presenterRef === presenter) {
    return;
  }

  presenter.initControls({
    onChange: handlePreferenceChange,
    getPreferences: getLayoutPreferences
  });
  layoutPresenterInitialized = true;
  presenterRef = presenter;
}

function handlePreferenceChange(section, patch) {
  updateLayoutPreferences(section, patch);
  applyFilters();
}

function applyFilters() {
  syncPreferencesFromDom();
  const presenter = getPresenter();
  if (!presenter?.applyFilters || !currentCardModels) {
    return;
  }
  const model = buildLayoutModel(currentCardModels);
  presenter.applyFilters(model);
}

export function initLayoutControls() {
  setupTabs();
  setupEventLog();
  setupSlideOver();
  setupCommandPalette();
  setupKpiShortcuts();
  initializeLayoutPresenter();
  applyFilters();
}

export function activateShellPanel(panelId) {
  if (!panelId) return;
  if (typeof activePanelController === 'function') {
    activePanelController(panelId);
    return;
  }
  const { shellTabs = [] } = getElement('shellNavigation') || {};
  const tab = shellTabs.find(button => button?.getAttribute('aria-controls') === panelId);
  tab?.click?.();
}

export function applyCardFilters(models) {
  if (models) {
    currentCardModels = models;
  }
  initializeLayoutPresenter();
  applyFilters();
}

export default {
  initLayoutControls,
  activateShellPanel,
  applyCardFilters
};
