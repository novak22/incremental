import elements from './elements.js';

export function initLayoutControls() {
  setupSectionNavigation();
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

function setupSectionNavigation() {
  const links = elements.sectionNavLinks || [];
  const sections = elements.workspaceSections || [];
  if (!links.length || !sections.length) return;

  const sectionsById = new Map(sections.map(section => [section.id, section]));

  const activateLink = targetId => {
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const id = href.startsWith('#') ? href.slice(1) : href;
      const isMatch = id === targetId;
      link.classList.toggle('is-active', isMatch);
      link.setAttribute('aria-current', isMatch ? 'true' : 'false');
    }
  };

  for (const link of links) {
    link.addEventListener('click', event => {
      const href = link.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      const id = href.slice(1);
      const section = sectionsById.get(id);
      if (!section) return;
      event.preventDefault();
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      activateLink(id);
    });
  }

  activateLink(sections[0]?.id);

  if (typeof IntersectionObserver !== 'function') return;

  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => sections.indexOf(a.target) - sections.indexOf(b.target));
    if (visible.length === 0) return;
    const topSection = visible[0].target.id;
    activateLink(topSection);
  }, {
    rootMargin: '-40% 0px -40% 0px',
    threshold: [0.25, 0.6]
  });

  sections.forEach(section => observer.observe(section));
}

function setupStatsPanel() {
  const panel = elements.summaryPanel;
  const toggle = elements.statsToggle;
  if (!panel || !toggle) return;

  const update = expanded => {
    panel.dataset.collapsed = expanded ? 'false' : 'true';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.textContent = expanded ? 'Collapse breakdowns' : 'Expand breakdowns';
    const details = panel.querySelectorAll('details');
    details.forEach(detail => {
      detail.open = expanded;
    });
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
  const section = elements.assetSection;
  if (!section) return;

  const apply = () => {
    if (collapsed) {
      section.classList.toggle('is-collapsed', Boolean(collapsed.checked));
    }
    if (hideLocked) {
      section.classList.toggle('hide-locked', Boolean(hideLocked.checked));
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
