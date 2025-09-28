import elements from './elements.js';

export function initLayoutControls() {
  setupNavigation();
  setupStatsPanel();
  setupLogToggle();
  setupGlobalFilters();
  setupHustleFilter();
  setupEducationFilters();
  setupAssetFilters();
  setupUpgradeSearch();
  applyCardFilters();
}

export function applyCardFilters() {
  applyHustleFilter();
  applyEducationFilters();
  applyUpgradeSearchFilter();
}

function setupNavigation() {
  if (!elements.navButtons?.length || !elements.views?.length) return;
  const viewMap = new Map(elements.views.map(view => [view.dataset.view, view]));

  const setActiveView = target => {
    if (!target || !viewMap.has(target)) return;
    for (const button of elements.navButtons) {
      button.classList.toggle('is-active', button.dataset.view === target);
    }
    for (const [key, view] of viewMap.entries()) {
      view.classList.toggle('is-active', key === target);
    }
  };

  for (const button of elements.navButtons) {
    button.addEventListener('click', () => setActiveView(button.dataset.view));
  }

  const activeButton = elements.navButtons.find(button => button.classList.contains('is-active'));
  setActiveView(activeButton?.dataset.view || elements.views[0].dataset.view);
}

function setupStatsPanel() {
  const panel = elements.summaryPanel;
  const toggle = elements.statsToggle;
  if (!panel || !toggle) return;

  const update = expanded => {
    panel.dataset.collapsed = expanded ? 'false' : 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Collapse breakdowns' : 'Expand breakdowns';
    if (!expanded) {
      const details = panel.querySelectorAll('details');
      details.forEach(detail => {
        detail.open = false;
      });
    }
  };

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    update(!expanded);
  });

  update(false);
}

function setupLogToggle() {
  const toggle = elements.logToggle;
  const feed = elements.logFeed;
  if (!toggle || !feed) return;
  const panel = feed.closest('.log');
  if (!panel) return;

  const update = expanded => {
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Summary view' : 'Detailed view';
    panel.classList.toggle('summary', !expanded);
  };

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    update(!expanded);
  });

  update(false);
}

function setupGlobalFilters() {
  const filters = elements.globalFilters;
  const container = elements.workspacePanels;
  if (!filters || !container) return;

  const apply = () => {
    container.classList.toggle('hide-locked', Boolean(filters.hideLocked?.checked));
    container.classList.toggle('hide-completed', Boolean(filters.hideCompleted?.checked));
    container.classList.toggle('show-active-only', Boolean(filters.showActive?.checked));
    applyCardFilters();
  };

  Object.values(filters).forEach(input => {
    if (!input) return;
    input.addEventListener('change', apply);
  });

  apply();
}

function setupHustleFilter() {
  const checkbox = elements.hustlesFilters?.availableOnly;
  if (!checkbox) return;
  checkbox.addEventListener('change', applyHustleFilter);
}

function applyHustleFilter() {
  const checkbox = elements.hustlesFilters?.availableOnly;
  const shouldFilter = Boolean(checkbox?.checked);
  const cards = elements.hustleGrid?.querySelectorAll('.card') || [];
  cards.forEach(card => {
    if (!shouldFilter) {
      card.classList.remove('is-filtered');
      return;
    }
    const button = card.querySelector('button');
    const available = button ? !button.disabled : true;
    card.classList.toggle('is-filtered', !available);
  });
}

function setupEducationFilters() {
  const { activeOnly, hideComplete } = elements.educationFilters || {};
  if (activeOnly) activeOnly.addEventListener('change', applyEducationFilters);
  if (hideComplete) hideComplete.addEventListener('change', applyEducationFilters);
}

function applyEducationFilters() {
  const cards = elements.educationGrid?.querySelectorAll('.card') || [];
  const activeOnly = Boolean(elements.educationFilters?.activeOnly?.checked);
  const hideComplete = Boolean(elements.educationFilters?.hideComplete?.checked);

  cards.forEach(card => {
    let hidden = false;
    const completed = card.classList.contains('completed');
    const inProgress = card.dataset.inProgress === 'true';

    if (hideComplete && completed) {
      hidden = true;
    }
    if (activeOnly && !inProgress) {
      hidden = true;
    }

    card.classList.toggle('is-filtered', hidden);
  });
}

function setupAssetFilters() {
  const { collapsed, hideLocked } = elements.assetsFilters || {};
  const view = elements.views?.find(section => section.dataset.view === 'assets');
  if (!view) return;

  const apply = () => {
    if (collapsed) {
      view.classList.toggle('is-collapsed', Boolean(collapsed.checked));
    }
    if (hideLocked) {
      view.classList.toggle('hide-locked', Boolean(hideLocked.checked));
    }
  };

  if (collapsed) collapsed.addEventListener('change', apply);
  if (hideLocked) hideLocked.addEventListener('change', apply);

  apply();
}

function setupUpgradeSearch() {
  const input = elements.upgradeSearch;
  if (!input) return;
  input.addEventListener('input', applyUpgradeSearchFilter);
}

function applyUpgradeSearchFilter() {
  const term = (elements.upgradeSearch?.value || '').trim().toLowerCase();
  const containers = elements.upgradeGroupGrids ? Object.values(elements.upgradeGroupGrids) : [];

  containers.forEach(container => {
    if (!container) return;
    const cards = container.querySelectorAll('.card');
    let visibleCount = 0;
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      const match = !term || text.includes(term);
      card.classList.toggle('is-filtered', !match);
      if (match) visibleCount += 1;
    });
    const group = container.closest('.upgrade-group');
    if (group) {
      group.classList.toggle('is-empty', visibleCount === 0);
    }
  });
}
