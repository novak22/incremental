import { getElement } from './elements/registry.js';

let activePanelController = null;

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

export function initLayoutControls() {
  setupTabs();
  setupEventLog();
  setupSlideOver();
  setupCommandPalette();
  setupFilterHandlers();
  setupKpiShortcuts();
}

export function applyCardFilters() {
  applyHustleFilters();
  applyUpgradeFilters();
  applyStudyFilters();
  applyAssetFilters();
}

function setupTabs() {
  const { shellTabs = [], panels = [] } = getElement('shellNavigation') || {};
  if (!shellTabs.length || !panels.length) return;

  const activate = targetId => {
    for (const tab of shellTabs) {
      const isActive = tab.getAttribute('aria-controls') === targetId;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    }
    for (const panel of panels) {
      const match = panel.id === targetId;
      panel.classList.toggle('is-active', match);
      panel.hidden = !match;
    }
  };

  activePanelController = activate;

  shellTabs.forEach(tab => {
    tab.addEventListener('click', () => activate(tab.getAttribute('aria-controls')));
  });

  activate('panel-dashboard');
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
    commandPaletteSearch.value = '';
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

function setupFilterHandlers() {
  const hustleControls = getElement('hustleControls') || {};
  hustleControls.hustleAvailableToggle?.addEventListener('change', applyHustleFilters);
  hustleControls.hustleSort?.addEventListener('change', applyHustleFilters);
  hustleControls.hustleSearch?.addEventListener('input', debounce(applyHustleFilters, 120));

  const assetFilters = getElement('assetFilters') || {};
  assetFilters.activeOnly?.addEventListener('change', applyAssetFilters);
  assetFilters.maintenance?.addEventListener('change', applyAssetFilters);
  assetFilters.lowRisk?.addEventListener('change', applyAssetFilters);

  const upgradeFilters = getElement('upgradeFilters') || {};
  upgradeFilters.unlocked?.addEventListener('change', applyUpgradeFilters);

  document.addEventListener('upgrades:state-updated', applyUpgradeFilters);
  document.addEventListener('hustles:availability-updated', applyHustleFilters);

  const studyFilters = getElement('studyFilters') || {};
  studyFilters.activeOnly?.addEventListener('change', applyStudyFilters);
  studyFilters.hideComplete?.addEventListener('change', applyStudyFilters);
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

function applyHustleFilters() {
  const { hustleList, hustleAvailableToggle, hustleSort, hustleSearch } =
    getElement('hustleControls') || {};
  const cards = Array.from(hustleList?.querySelectorAll('[data-hustle]') || []);
  const availableOnly = Boolean(hustleAvailableToggle?.checked);
  const sortValue = hustleSort?.value || 'roi';
  const query = (hustleSearch?.value || '').trim().toLowerCase();

  const comparators = {
    roi: (a, b) => Number(b.card.dataset.roi || 0) - Number(a.card.dataset.roi || 0),
    payout: (a, b) => Number(b.card.dataset.payout || 0) - Number(a.card.dataset.payout || 0),
    time: (a, b) => Number(a.card.dataset.time || 0) - Number(b.card.dataset.time || 0)
  };
  const selectedComparator = comparators[sortValue] || comparators.roi;
  const payoutComparator = comparators.payout;

  const meta = cards.map(card => {
    const available = card.dataset.available === 'true';
    const matchesSearch = !query || card.dataset.search?.includes(query);
    const matchesAvailability = !availableOnly || available;
    card.hidden = !(matchesSearch && matchesAvailability);
    return { card, available };
  });

  meta.sort((a, b) => {
    if (a.available !== b.available) {
      return a.available ? -1 : 1;
    }
    if (a.available) {
      const primary = selectedComparator(a, b);
      if (primary !== 0) return primary;
      return payoutComparator(a, b);
    }
    const fallback = payoutComparator(a, b);
    if (fallback !== 0) return fallback;
    return selectedComparator(a, b);
  });

  const fragment = document.createDocumentFragment();
  meta.forEach(entry => fragment.appendChild(entry.card));
  hustleList?.appendChild(fragment);
}

function applyAssetFilters() {
  const gallery = getElement('assetGallery');
  const filters = getElement('assetFilters') || {};
  const cards = Array.from(gallery?.querySelectorAll('[data-asset]') || []);
  const activeOnly = Boolean(filters.activeOnly?.checked);
  const maintenanceOnly = Boolean(filters.maintenance?.checked);
  const hideRisk = Boolean(filters.lowRisk?.checked);

  cards.forEach(card => {
    let hidden = false;
    if (activeOnly && card.dataset.state !== 'active') hidden = true;
    if (maintenanceOnly && card.dataset.needsMaintenance !== 'true') hidden = true;
    if (hideRisk && card.dataset.risk === 'high') hidden = true;
    card.hidden = hidden;
  });
}

function applyUpgradeFilters() {
  const list = getElement('upgradeList');
  const filters = getElement('upgradeFilters') || {};
  const cards = Array.from(list?.querySelectorAll('[data-upgrade]') || []);
  const unlockedOnly = filters.unlocked?.checked !== false;

  cards.forEach(card => {
    const matchesUnlocked = !unlockedOnly || card.dataset.ready === 'true';
    card.hidden = !matchesUnlocked;
  });

  emitLayoutEvent('upgrades:filtered');
}

function applyStudyFilters() {
  const trackList = getElement('studyTrackList');
  const filters = getElement('studyFilters') || {};
  const tracks = Array.from(trackList?.querySelectorAll('[data-track]') || []);
  const activeOnly = Boolean(filters.activeOnly?.checked);
  const hideComplete = Boolean(filters.hideComplete?.checked);

  tracks.forEach(track => {
    const isActive = track.dataset.active === 'true';
    const isComplete = track.dataset.complete === 'true';
    let hidden = false;
    if (activeOnly && !isActive) hidden = true;
    if (hideComplete && isComplete) hidden = true;
    track.hidden = hidden;
  });
}

function debounce(fn, wait = 120) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
