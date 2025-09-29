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

  elements.upgradeFilters.affordable?.addEventListener('change', applyUpgradeFilters);
  elements.upgradeFilters.available?.addEventListener('change', applyUpgradeFilters);
  elements.upgradeSearch?.addEventListener('input', debounce(applyUpgradeFilters, 150));

  document.addEventListener('upgrades:state-updated', applyUpgradeFilters);
  document.addEventListener('hustles:availability-updated', applyHustleFilters);

  elements.studyFilters.activeOnly?.addEventListener('change', applyStudyFilters);
  elements.studyFilters.hideComplete?.addEventListener('change', applyStudyFilters);
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
  const rows = Array.from(elements.assetTableBody?.querySelectorAll('tr') || []);
  const activeOnly = Boolean(elements.assetFilters.activeOnly?.checked);
  const maintenanceOnly = Boolean(elements.assetFilters.maintenance?.checked);
  const hideRisk = Boolean(elements.assetFilters.lowRisk?.checked);

  rows.forEach(row => {
    let hidden = false;
    if (activeOnly && row.dataset.state !== 'active') hidden = true;
    if (maintenanceOnly && row.dataset.needsMaintenance !== 'true') hidden = true;
    if (hideRisk && row.dataset.risk === 'high') hidden = true;
    row.hidden = hidden;
  });
}

function applyUpgradeFilters() {
  const cards = Array.from(elements.upgradeList?.querySelectorAll('[data-upgrade]') || []);
  const affordableOnly = Boolean(elements.upgradeFilters.affordable?.checked);
  const availableOnly = Boolean(elements.upgradeFilters.available?.checked);
  const query = (elements.upgradeSearch?.value || '').trim().toLowerCase();

  cards.forEach(card => {
    const matchesSearch = !query || card.dataset.search?.includes(query);
    const matchesAffordable = !affordableOnly || card.dataset.affordable === 'true';
    const matchesAvailability = !availableOnly || card.dataset.ready === 'true';
    card.hidden = !(matchesSearch && matchesAffordable && matchesAvailability);
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
