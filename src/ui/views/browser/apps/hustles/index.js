import { formatHours, formatMoney } from '../../../../../core/helpers.js';
import { getPageByType } from '../pageLookup.js';
import { createStat, formatRoi } from '../../components/widgets.js';
import { createOfferList } from './offers.js';
import { createCommitmentList } from './commitments.js';

const DEFAULT_COPY = {
  ready: {
    title: 'Live offers',
    description: 'Accept to pull this hustle into your active worklist.'
  },
  upcoming: {
    title: 'Next wave',
    description: "Locked until the next refresh. Line up your hours now."
  },
  commitments: {
    title: 'Active delivery',
    description: 'Currently assigned. Track progress and close it out.'
  }
};

const CATEGORY_THEMES = {
  writing: 'blue',
  promo: 'green',
  survey: 'amber',
  assistant: 'purple',
  ops: 'slate',
  data: 'slate'
};

const downworkState = new WeakMap();

function mergeCopy(base = {}, overrides = {}) {
  return {
    ready: { ...DEFAULT_COPY.ready, ...base.ready, ...overrides.ready },
    upcoming: { ...DEFAULT_COPY.upcoming, ...base.upcoming, ...overrides.upcoming },
    commitments: { ...DEFAULT_COPY.commitments, ...base.commitments, ...overrides.commitments }
  };
}

function getThemeKey(category = '') {
  const normalized = String(category || '').toLowerCase();
  return CATEGORY_THEMES[normalized] ? normalized : 'default';
}

function getDownworkState(container) {
  if (!downworkState.has(container)) {
    downworkState.set(container, {
      tab: 'market',
      category: 'all',
      search: ''
    });
  }
  return downworkState.get(container);
}

function describeCounts({ availableCount, upcomingCount, commitmentCount }) {
  const parts = [];
  parts.push(`${availableCount} ready`);
  parts.push(`${upcomingCount} queued`);
  parts.push(`${commitmentCount} active`);
  return `Market pulse — ${parts.join(' • ')}`;
}

export function describeMetaSummary({ availableCount, upcomingCount, commitmentCount }) {
  if (!availableCount && !upcomingCount && !commitmentCount) {
    return 'DownWork is quiet right now — refresh soon for fresh leads.';
  }
  return describeCounts({ availableCount, upcomingCount, commitmentCount });
}

function buildCardSection(copy = {}, sectionKey = '') {
  const section = document.createElement('section');
  section.className = 'downwork-card__section';
  if (sectionKey) {
    section.dataset.section = sectionKey;
  }

  if (copy.title) {
    const heading = document.createElement('h3');
    heading.className = 'downwork-card__section-title';
    heading.textContent = copy.title;
    section.appendChild(heading);
  }

  if (copy.description) {
    const note = document.createElement('p');
    note.className = 'downwork-card__section-note';
    note.textContent = copy.description;
    section.appendChild(note);
  }

  return section;
}

function buildStepsSummary(categoryLabel = 'hustle') {
  const list = document.createElement('ol');
  list.className = 'downwork-card__steps';

  const steps = [
    { label: 'Accept offer', detail: 'Reserve a slot and sync it to your dashboard.' },
    { label: 'Move to active worklist', detail: `Track deliverables and log ${categoryLabel.toLowerCase()} hours.` }
  ];

  steps.forEach(step => {
    const item = document.createElement('li');
    item.className = 'downwork-card__step';

    const title = document.createElement('span');
    title.className = 'downwork-card__step-label';
    title.textContent = step.label;
    item.appendChild(title);

    if (step.detail) {
      const detail = document.createElement('span');
      detail.className = 'downwork-card__step-detail';
      detail.textContent = step.detail;
      item.appendChild(detail);
    }

    list.appendChild(item);
  });

  return list;
}

export function createHustleCard({
  definition = {},
  model = {},
  copy: copyOverrides = {},
  descriptors: descriptorOverrides = {}
} = {}) {
  const descriptorBundle = {
    ...(typeof model.descriptors === 'object' && model.descriptors !== null ? model.descriptors : {}),
    ...(typeof descriptorOverrides === 'object' && descriptorOverrides !== null ? descriptorOverrides : {})
  };

  const copy = mergeCopy(descriptorBundle.copy, copyOverrides);

  const rawOffers = Array.isArray(model.offers) ? model.offers : [];
  const rawUpcoming = Array.isArray(model.upcoming) ? model.upcoming : [];
  const visibleOffers = rawOffers.filter(offer => !offer?.locked);
  const visibleUpcoming = rawUpcoming.filter(offer => !offer?.locked);
  const hasCommitments = Array.isArray(model.commitments) && model.commitments.length > 0;

  const hasAnySource = rawOffers.length > 0 || rawUpcoming.length > 0;
  const hasUnlockedContent = visibleOffers.length > 0 || visibleUpcoming.length > 0;

  if (!hasUnlockedContent && hasAnySource && !hasCommitments) {
    return null;
  }

  const card = document.createElement('article');
  card.className = 'downwork-card';
  card.dataset.role = 'downwork-card';
  card.dataset.action = model.id || definition.id || '';
  card.dataset.hustle = model.id || definition.id || '';
  card.dataset.search = model.filters?.search || '';
  card.dataset.time = String(model.metrics?.time?.value ?? 0);
  card.dataset.payout = String(model.metrics?.payout?.value ?? 0);
  card.dataset.roi = String(model.metrics?.roi ?? 0);
  card.dataset.available = visibleOffers.length > 0 ? 'true' : 'false';
  card.dataset.availableOffers = String(visibleOffers.length);
  card.dataset.upcomingOffers = String(visibleUpcoming.length);
  card.dataset.hasCommitments = hasCommitments ? 'true' : 'false';

  if (model.filters?.limitRemaining !== null && model.filters?.limitRemaining !== undefined) {
    card.dataset.limitRemaining = String(model.filters.limitRemaining);
  }

  if (model.filters?.category) {
    card.dataset.category = model.filters.category;
  }

  if (model.actionCategory) {
    card.dataset.actionCategory = model.actionCategory;
  }

  if (model.filters?.marketCategory) {
    card.dataset.marketCategory = model.filters.marketCategory;
  }

  const themeKey = getThemeKey(model.filters?.marketCategory || model.category);
  card.dataset.theme = CATEGORY_THEMES[themeKey] || 'neutral';

  const header = document.createElement('header');
  header.className = 'downwork-card__header';

  const titleBlock = document.createElement('div');
  titleBlock.className = 'downwork-card__title-block';

  const categoryLabel = model.labels?.category || model.categoryLabel || model.filters?.categoryLabel;
  if (categoryLabel) {
    const categoryTag = document.createElement('span');
    categoryTag.className = 'downwork-card__category';
    categoryTag.textContent = categoryLabel;
    titleBlock.appendChild(categoryTag);
  }

  const title = document.createElement('h2');
  title.className = 'downwork-card__title';
  title.textContent = model.name || definition.name || 'Contract';
  titleBlock.appendChild(title);

  header.appendChild(titleBlock);

  const roi = document.createElement('span');
  roi.className = 'downwork-card__roi';
  roi.textContent = formatRoi(model.metrics?.roi);
  header.appendChild(roi);

  card.appendChild(header);

  if (model.description) {
    const summary = document.createElement('p');
    summary.className = 'downwork-card__summary';
    summary.textContent = model.description;
    card.appendChild(summary);
  }

  const badges = Array.isArray(model.badges) ? model.badges : [];
  if (badges.length > 0) {
    const list = document.createElement('ul');
    list.className = 'downwork-card__badges';
    badges.forEach(entry => {
      if (!entry) return;
      const item = document.createElement('li');
      item.className = 'downwork-card__badge';
      item.textContent = entry;
      list.appendChild(item);
    });
    card.appendChild(list);
  }

  const stats = document.createElement('div');
  stats.className = 'downwork-card__metrics';
  const payoutValue = model.metrics?.payout?.value ?? 0;
  const payoutLabel = model.metrics?.payout?.label
    || (payoutValue > 0 ? `$${formatMoney(payoutValue)}` : 'Varies');
  stats.append(
    createStat('Time', model.metrics?.time?.label || formatHours(model.metrics?.time?.value ?? 0)),
    createStat('Payout', payoutLabel),
    createStat('ROI', formatRoi(model.metrics?.roi))
  );
  card.appendChild(stats);

  const meta = document.createElement('p');
  meta.className = 'downwork-card__meta';
  meta.textContent = model.requirements?.summary || 'No requirements';
  card.appendChild(meta);

  if (model.seat?.summary) {
    const seat = document.createElement('p');
    seat.className = 'downwork-card__note';
    seat.textContent = model.seat.summary;
    card.appendChild(seat);
  }

  if (model.limit?.summary) {
    const limit = document.createElement('p');
    limit.className = 'downwork-card__note';
    limit.textContent = model.limit.summary;
    card.appendChild(limit);
  }

  if (model.action?.label) {
    const actions = document.createElement('div');
    actions.className = 'downwork-card__actions';

    const button = document.createElement('button');
    button.type = 'button';
    const variantName = model.action.className === 'secondary' ? 'secondary' : 'primary';
    button.className = `downwork-card__button downwork-card__button--${variantName}`;
    button.textContent = model.action.label;
    button.disabled = Boolean(model.action.disabled);

    if (typeof model.action?.onClick === 'function') {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        model.action.onClick();
      });
    }

    actions.appendChild(button);

    if (model.action?.guidance) {
      const note = document.createElement('p');
      note.className = 'downwork-card__guidance';
      note.textContent = model.action.guidance;
      actions.appendChild(note);
    }

    card.appendChild(actions);
  }

  const steps = buildStepsSummary(model.labels?.category || model.categoryLabel || 'hustle');
  card.appendChild(steps);

  if (hasCommitments) {
    const commitmentsSection = buildCardSection(copy.commitments, 'commitments');
    const list = createCommitmentList(model.commitments);
    commitmentsSection.appendChild(list);
    card.appendChild(commitmentsSection);
  }

  if (visibleOffers.length) {
    const offersSection = buildCardSection(copy.ready, 'offers');
    const list = createOfferList(visibleOffers);
    offersSection.appendChild(list);
    card.appendChild(offersSection);
  }

  if (visibleUpcoming.length) {
    const upcomingSection = buildCardSection(copy.upcoming, 'upcoming');
    const list = createOfferList(visibleUpcoming, { upcoming: true });
    upcomingSection.appendChild(list);
    card.appendChild(upcomingSection);
  }

  return card;
}

function buildShell(body) {
  let container = body.querySelector('.downwork');
  if (container) {
    return container;
  }

  container = document.createElement('div');
  container.className = 'downwork';
  container.dataset.role = 'downwork-app';

  const header = document.createElement('header');
  header.className = 'downwork-header';

  const brand = document.createElement('div');
  brand.className = 'downwork-header__brand';

  const logo = document.createElement('span');
  logo.className = 'downwork-header__logo';
  logo.textContent = 'DW';
  brand.appendChild(logo);

  const identity = document.createElement('div');
  identity.className = 'downwork-header__identity';

  const title = document.createElement('h1');
  title.className = 'downwork-header__title';
  title.textContent = 'DownWork';
  identity.appendChild(title);

  const tagline = document.createElement('p');
  tagline.className = 'downwork-header__tagline';
  tagline.textContent = 'Find gigs. Fill hours. Fund the dream.';
  identity.appendChild(tagline);

  brand.appendChild(identity);
  header.appendChild(brand);

  const controls = document.createElement('div');
  controls.className = 'downwork-header__controls';

  const tabList = document.createElement('div');
  tabList.className = 'downwork-tabs';
  tabList.dataset.role = 'downwork-tabs';

  const tabs = [
    { key: 'active', label: 'Active Hustles' },
    { key: 'market', label: 'Market' },
    { key: 'history', label: 'History' }
  ];

  tabs.forEach(tab => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'downwork-tab';
    button.dataset.tab = tab.key;
    button.textContent = tab.label;
    if (tab.key === 'market') {
      button.classList.add('is-active');
      button.setAttribute('aria-pressed', 'true');
    } else {
      button.setAttribute('aria-pressed', 'false');
    }
    tabList.appendChild(button);
  });

  controls.appendChild(tabList);

  const searchForm = document.createElement('form');
  searchForm.className = 'downwork-search';
  searchForm.setAttribute('role', 'search');
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
  });

  const searchLabel = document.createElement('label');
  searchLabel.className = 'downwork-search__label';
  searchLabel.setAttribute('for', 'downwork-search-input');
  searchLabel.textContent = 'Search';
  searchForm.appendChild(searchLabel);

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.id = 'downwork-search-input';
  searchInput.className = 'downwork-search__input';
  searchInput.placeholder = 'Search gigs or categories…';
  searchInput.dataset.role = 'downwork-search-input';
  searchForm.appendChild(searchInput);

  controls.appendChild(searchForm);

  const status = document.createElement('p');
  status.className = 'downwork-header__status';
  status.dataset.role = 'downwork-status';
  controls.appendChild(status);

  const cta = document.createElement('button');
  cta.type = 'button';
  cta.className = 'downwork-header__cta';
  cta.textContent = 'Post a Gig';
  cta.disabled = true;
  cta.title = 'Internal beta — posting opens later.';
  controls.appendChild(cta);

  header.appendChild(controls);
  container.appendChild(header);

  const bodyRegion = document.createElement('div');
  bodyRegion.className = 'downwork-body';

  const filters = document.createElement('div');
  filters.className = 'downwork-filters';

  const filterLabel = document.createElement('p');
  filterLabel.className = 'downwork-filters__label';
  filterLabel.textContent = 'Filter by track';
  filters.appendChild(filterLabel);

  const pills = document.createElement('div');
  pills.className = 'downwork-filter-pills';
  pills.dataset.role = 'downwork-filter-pills';
  filters.appendChild(pills);

  bodyRegion.appendChild(filters);

  const grid = document.createElement('div');
  grid.className = 'downwork-grid';
  grid.dataset.role = 'browser-hustle-list';
  bodyRegion.appendChild(grid);

  const empty = document.createElement('div');
  empty.className = 'downwork-empty';
  empty.dataset.role = 'downwork-empty';

  const emptyTitle = document.createElement('h2');
  emptyTitle.textContent = 'No gigs right now — the market’s quiet.';
  empty.appendChild(emptyTitle);

  const emptyCopy = document.createElement('p');
  emptyCopy.textContent = 'Check back after the refresh or free up an active slot to see new leads.';
  empty.appendChild(emptyCopy);

  bodyRegion.appendChild(empty);

  container.appendChild(bodyRegion);
  body.appendChild(container);

  return container;
}

function syncTabState(container, state) {
  const buttons = container.querySelectorAll('[data-role="downwork-tabs"] .downwork-tab');
  buttons.forEach(button => {
    const selected = button.dataset.tab === state.tab;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

function syncCategoryPills(container, categories, state) {
  const host = container.querySelector('[data-role="downwork-filter-pills"]');
  if (!host) return;
  host.innerHTML = '';

  const entries = [
    { key: 'all', label: 'All tracks' },
    ...categories
  ];

  const availableKeys = new Set(entries.map(entry => entry.key));
  if (!availableKeys.has(state.category)) {
    state.category = 'all';
  }

  entries.forEach(entry => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'downwork-pill';
    button.dataset.category = entry.key;
    button.textContent = entry.label;
    if (entry.key === state.category) {
      button.classList.add('is-active');
    }
    host.appendChild(button);
  });
}

function applyFilters(container, state) {
  const grid = container.querySelector('[data-role="browser-hustle-list"]');
  if (!grid) return;
  const term = state.search.trim().toLowerCase();
  const cards = Array.from(grid.querySelectorAll('[data-role="downwork-card"]'));
  let visibleCount = 0;

  cards.forEach(card => {
    let visible = true;

    if (state.tab === 'active') {
      visible = card.dataset.hasCommitments === 'true';
    } else if (state.tab === 'history') {
      visible = card.dataset.hasHistory === 'true';
    } else {
      const offers = Number(card.dataset.availableOffers || '0');
      const upcoming = Number(card.dataset.upcomingOffers || '0');
      visible = offers + upcoming > 0;
    }

    if (visible && state.category !== 'all') {
      visible = (card.dataset.marketCategory || '') === state.category;
    }

    if (visible && term) {
      const haystack = `${card.dataset.search || ''} ${card.textContent || ''}`.toLowerCase();
      visible = haystack.includes(term);
    }

    card.hidden = !visible;
    if (visible) {
      visibleCount += 1;
    }
  });

  const empty = container.querySelector('[data-role="downwork-empty"]');
  if (empty) {
    empty.hidden = visibleCount > 0;
  }
}

function bindInteractions(container) {
  const state = getDownworkState(container);

  const tabs = container.querySelector('[data-role="downwork-tabs"]');
  if (tabs && !tabs.dataset.bound) {
    tabs.addEventListener('click', event => {
      const button = event.target.closest('[data-tab]');
      if (!button) return;
      state.tab = button.dataset.tab || 'market';
      syncTabState(container, state);
      applyFilters(container, state);
    });
    tabs.dataset.bound = 'true';
  }

  const pills = container.querySelector('[data-role="downwork-filter-pills"]');
  if (pills && !pills.dataset.bound) {
    pills.addEventListener('click', event => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      state.category = button.dataset.category || 'all';
      pills.querySelectorAll('.downwork-pill').forEach(pill => {
        const selected = pill.dataset.category === state.category;
        pill.classList.toggle('is-active', selected);
      });
      applyFilters(container, state);
    });
    pills.dataset.bound = 'true';
  }

  const search = container.querySelector('[data-role="downwork-search-input"]');
  if (search && !search.dataset.bound) {
    search.addEventListener('input', () => {
      state.search = search.value || '';
      applyFilters(container, state);
    });
    search.dataset.bound = 'true';
  }
}

function summarizeLimits(models = []) {
  let tracked = false;
  let total = 0;
  models.forEach(model => {
    const remaining = Number(model.filters?.limitRemaining);
    if (Number.isFinite(remaining)) {
      tracked = true;
      total += remaining;
    }
  });

  if (!tracked) return '';
  if (total <= 0) {
    return 'All hustle slots filled.';
  }
  const label = total === 1 ? 'run' : 'runs';
  return `${total} ${label} left today.`;
}

export default function renderHustles(context = {}, definitions = [], models = []) {
  const page = getPageByType('hustles');
  if (!page) return null;

  const refs = context.ensurePageContent?.(page, ({ body }) => {
    buildShell(body);
  });

  if (!refs) return null;

  const container = refs.body.querySelector('.downwork');
  const list = container?.querySelector('[data-role="browser-hustle-list"]');
  if (!container || !list) return null;
  list.innerHTML = '';

  const modelMap = new Map(models.map(model => [model?.id, model]));
  let availableCount = 0;
  let commitmentCount = 0;
  let upcomingCount = 0;
  const state = getDownworkState(container);
  const categories = new Map();

  definitions.forEach(definition => {
    const model = modelMap.get(definition.id);
    if (!model) return;

    const visibleOffersCount = Array.isArray(model.offers)
      ? model.offers.filter(offer => !offer?.locked).length
      : 0;
    if (visibleOffersCount > 0) {
      availableCount += 1;
    }

    if (Array.isArray(model.commitments)) {
      commitmentCount += model.commitments.length;
    }

    const visibleUpcomingCount = Array.isArray(model.upcoming)
      ? model.upcoming.filter(offer => !offer?.locked).length
      : 0;
    if (visibleUpcomingCount > 0) {
      upcomingCount += visibleUpcomingCount;
    }

    const card = createHustleCard({ definition, model });
    if (card) {
      const categoryKey = card.dataset.marketCategory || '';
      if (categoryKey && !categories.has(categoryKey)) {
        const label = model.labels?.category || model.categoryLabel || categoryKey;
        categories.set(categoryKey, label);
      }
      list.appendChild(card);
    }
  });

  const categoryEntries = Array.from(categories.entries()).map(([key, label]) => ({ key, label }));
  syncCategoryPills(container, categoryEntries, state);
  bindInteractions(container);
  syncTabState(container, state);
  applyFilters(container, state);

  const status = container.querySelector('[data-role="downwork-status"]');
  const limitSummary = summarizeLimits(models);
  const countsSummary = describeCounts({ availableCount, upcomingCount, commitmentCount });
  if (status) {
    status.textContent = limitSummary || countsSummary;
  }

  const meta = describeMetaSummary({ availableCount, upcomingCount, commitmentCount });

  return {
    id: page.id,
    meta
  };
}
