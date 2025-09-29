import elements from './elements.js';

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
  elements.upgradeFilters.favorites?.addEventListener('change', applyUpgradeFilters);
  elements.upgradeSearch?.addEventListener('input', debounce(applyUpgradeFilters, 150));

  elements.studyFilters.activeOnly?.addEventListener('change', applyStudyFilters);
  elements.studyFilters.hideComplete?.addEventListener('change', applyStudyFilters);
}

function applyHustleFilters() {
  const cards = Array.from(elements.hustleList?.querySelectorAll('[data-hustle]') || []);
  const availableOnly = Boolean(elements.hustleAvailableToggle?.checked);
  const sortValue = elements.hustleSort?.value || 'roi';
  const query = (elements.hustleSearch?.value || '').trim().toLowerCase();

  cards.forEach(card => {
    const matchesSearch = !query || card.dataset.search?.includes(query);
    const matchesAvailability = !availableOnly || card.dataset.available === 'true';
    card.hidden = !(matchesSearch && matchesAvailability);
  });

  if (sortValue === 'payout') {
    cards.sort((a, b) => Number(b.dataset.payout || 0) - Number(a.dataset.payout || 0));
  } else if (sortValue === 'time') {
    cards.sort((a, b) => Number(a.dataset.time || 0) - Number(b.dataset.time || 0));
  } else {
    cards.sort((a, b) => Number(b.dataset.roi || 0) - Number(a.dataset.roi || 0));
  }

  const fragment = document.createDocumentFragment();
  cards.forEach(card => fragment.appendChild(card));
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
  const favoritesOnly = Boolean(elements.upgradeFilters.favorites?.checked);
  const query = (elements.upgradeSearch?.value || '').trim().toLowerCase();

  cards.forEach(card => {
    const matchesSearch = !query || card.dataset.search?.includes(query);
    const matchesAffordable = !affordableOnly || card.dataset.affordable === 'true';
    const matchesFavorites = !favoritesOnly || card.dataset.favorite === 'true';
    card.hidden = !(matchesSearch && matchesAffordable && matchesFavorites);
  });
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
