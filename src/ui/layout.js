import elements from './elements.js';

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
  const { shellTabs, panels } = elements;
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

  shellTabs.forEach(tab => {
    tab.addEventListener('click', () => activate(tab.getAttribute('aria-controls')));
  });

  activate('panel-dashboard');
}

function setupEventLog() {
  const { openEventLog, eventLogPanel, eventLogClose } = elements;
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
  const { slideOver, slideOverBackdrop, slideOverClose } = elements;
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
  const {
    commandPalette,
    commandPaletteTrigger,
    commandPaletteBackdrop,
    commandPaletteSearch
  } = elements;
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
  elements.hustleAvailableToggle?.addEventListener('change', applyHustleFilters);
  elements.hustleSort?.addEventListener('change', applyHustleFilters);
  elements.hustleSearch?.addEventListener('input', debounce(applyHustleFilters, 120));

  elements.assetFilters.activeOnly?.addEventListener('change', applyAssetFilters);
  elements.assetFilters.maintenance?.addEventListener('change', applyAssetFilters);
  elements.assetFilters.lowRisk?.addEventListener('change', applyAssetFilters);

  elements.upgradeFilters.unlocked?.addEventListener('change', applyUpgradeFilters);

  document.addEventListener('upgrades:state-updated', applyUpgradeFilters);
  document.addEventListener('hustles:availability-updated', applyHustleFilters);

  elements.studyFilters.activeOnly?.addEventListener('change', applyStudyFilters);
  elements.studyFilters.hideComplete?.addEventListener('change', applyStudyFilters);
}

function setupKpiShortcuts() {
  const buttons = Object.values(elements.kpis || {}).filter(Boolean);
  if (!buttons.length) return;

  const targetLookup = {
    cash: () => elements.dailyStats.earningsActive?.closest('.daily-stats__section')
      || elements.dailyStats.earningsActive
      || elements.dailyStats.earningsSummary,
    net: () => elements.dailyStats.spendList?.closest('.daily-stats__section')
      || elements.dailyStats.spendList
      || elements.dailyStats.spendSummary,
    time: () => elements.dailyStats.timeList?.closest('.daily-stats__section')
      || elements.dailyStats.timeList
      || elements.dailyStats.timeSummary,
    upkeep: () => elements.notifications?.closest('.dashboard-card') || elements.notifications,
    assets: () => elements.assetUpgradeActions?.closest('.dashboard-card') || elements.assetUpgradeActions,
    study: () => elements.dailyStats.studyList?.closest('.daily-stats__section')
      || elements.dailyStats.studyList
      || elements.dailyStats.studySummary
  };

  const statusMessages = {
    cash: 'Scooting to the daily earnings breakdown.',
    net: 'Reviewing how today’s inflows and outflows balance.',
    time: 'Hopping down to the time ledger for today.',
    upkeep: 'Checking upkeep reminders and notifications.',
    assets: 'Spotlighting active assets and upgrade prospects.',
    study: 'Beaming over to the study progress section.'
  };

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const detail = button.dataset.detail;
      const target = targetLookup[detail]?.();
      if (!target) return;

      focusDashboardSection(target);
      const message = statusMessages[detail];
      if (message && elements.sessionStatus) {
        elements.sessionStatus.textContent = message;
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
  const cards = Array.from(elements.hustleList?.querySelectorAll('[data-hustle]') || []);
  const availableOnly = Boolean(elements.hustleAvailableToggle?.checked);
  const sortValue = elements.hustleSort?.value || 'roi';
  const query = (elements.hustleSearch?.value || '').trim().toLowerCase();

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
  elements.hustleList?.appendChild(fragment);
}

function applyAssetFilters() {
  const cards = Array.from(elements.assetGallery?.querySelectorAll('[data-asset]') || []);
  const activeOnly = Boolean(elements.assetFilters.activeOnly?.checked);
  const maintenanceOnly = Boolean(elements.assetFilters.maintenance?.checked);
  const hideRisk = Boolean(elements.assetFilters.lowRisk?.checked);

  cards.forEach(card => {
    let hidden = false;
    if (activeOnly && card.dataset.state !== 'active') hidden = true;
    if (maintenanceOnly && card.dataset.needsMaintenance !== 'true') hidden = true;
    if (hideRisk && card.dataset.risk === 'high') hidden = true;
    card.hidden = hidden;
  });
}

function applyUpgradeFilters() {
  const cards = Array.from(elements.upgradeList?.querySelectorAll('[data-upgrade]') || []);
  const unlockedOnly = elements.upgradeFilters.unlocked?.checked !== false;

  cards.forEach(card => {
    const matchesUnlocked = !unlockedOnly || card.dataset.ready === 'true';
    card.hidden = !matchesUnlocked;
  });

  emitLayoutEvent('upgrades:filtered');
}

function applyStudyFilters() {
  const tracks = Array.from(elements.studyTrackList?.querySelectorAll('[data-track]') || []);
  const activeOnly = Boolean(elements.studyFilters.activeOnly?.checked);
  const hideComplete = Boolean(elements.studyFilters.hideComplete?.checked);

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
