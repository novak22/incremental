import { setNicheWatchlist } from '../../../../game/assets/niches.js';
import {
  formatCurrency as baseFormatCurrency,
  formatPercent as baseFormatPercent,
  formatSignedCurrency as baseFormatSignedCurrency
} from '../utils/formatting.js';
import {
  filterState,
  ensureRoot,
  getCurrentModel,
  getRefs,
  getWatchlistCount,
  setCurrentModel,
  updateEntryWatchlist
} from './trends/state.js';
import { clampScore, buildSparkline } from './trends/sparkline.js';
import { updateOverview } from './trends/overview.js';

const SORT_OPTIONS = [
  { key: 'momentum', label: 'Highest Momentum' },
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'payout', label: 'Payout Impact' },
  { key: 'cooling', label: 'Cooling Off' }
];

const DEFAULT_EMPTY_MESSAGE = 'No niches match your filters yet.';

const refs = getRefs();

const formatPercent = value =>
  baseFormatPercent(value, { nullFallback: '0%', signDisplay: 'always' });

const formatCurrency = amount =>
  baseFormatCurrency(amount, { absolute: true, precision: 'cent', signDisplay: 'never' });

const formatSignedCurrency = amount =>
  baseFormatSignedCurrency(amount, { precision: 'cent' });

function describeDelta(popularity = {}) {
  const raw = Number(popularity.delta);
  if (!Number.isFinite(raw)) return 'Fresh reading';
  if (raw === 0) return 'Holding steady';
  const sign = raw > 0 ? '+' : '';
  return `${sign}${raw} pts vs yesterday`;
}

function describeTrend(popularity = {}) {
  if (typeof popularity.summary === 'string' && popularity.summary) {
    return popularity.summary;
  }
  if (typeof popularity.label === 'string' && popularity.label) {
    return popularity.label;
  }
  return 'Trend pending';
}

function createOverviewCard(icon, label, key) {
  const card = document.createElement('article');
  card.className = 'trends-overview__card';

  const iconEl = document.createElement('span');
  iconEl.className = 'trends-overview__icon';
  iconEl.textContent = icon;

  const labelEl = document.createElement('span');
  labelEl.className = 'trends-overview__label';
  labelEl.textContent = label;

  const valueEl = document.createElement('strong');
  valueEl.className = 'trends-overview__value';
  valueEl.textContent = '—';

  const noteEl = document.createElement('span');
  noteEl.className = 'trends-overview__note';
  noteEl.textContent = '';

  card.append(iconEl, labelEl, valueEl, noteEl);
  refs.overview[key] = { value: valueEl, note: noteEl, card };
  return card;
}

function createToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'trends-toolbar';

  const searchLabel = document.createElement('label');
  searchLabel.className = 'trends-search';
  const searchText = document.createElement('span');
  searchText.textContent = 'Search';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search niche…';
  searchInput.addEventListener('input', event => {
    filterState.rawSearch = event.target.value;
    filterState.search = event.target.value.trim().toLowerCase();
    renderContent();
  });
  searchLabel.append(searchText, searchInput);
  refs.header.searchInput = searchInput;

  const sortLabel = document.createElement('label');
  sortLabel.className = 'trends-select';
  const sortText = document.createElement('span');
  sortText.textContent = 'Sort';
  const sortSelect = document.createElement('select');
  SORT_OPTIONS.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.key;
    opt.textContent = option.label;
    sortSelect.appendChild(opt);
  });
  sortSelect.value = filterState.sort;
  sortSelect.addEventListener('change', event => {
    filterState.sort = event.target.value;
    renderContent();
  });
  sortLabel.append(sortText, sortSelect);
  refs.header.sortSelect = sortSelect;

  const toggleGroup = document.createElement('div');
  toggleGroup.className = 'trends-toggle-group';
  ['all', 'watchlist'].forEach(view => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.viewMode = view;
    button.textContent = view === 'all' ? 'All Niches' : 'Watchlist';
    button.addEventListener('click', () => {
      if (filterState.view === view || button.disabled) return;
      filterState.view = view;
      renderContent();
    });
    refs.header.viewButtons[view] = button;
    toggleGroup.appendChild(button);
  });

  toolbar.append(searchLabel, sortLabel, toggleGroup);
  return toolbar;
}

function buildLayout(container) {
  container.innerHTML = '';

  const header = document.createElement('header');
  header.className = 'trends-app__header';

  const heading = document.createElement('div');
  heading.className = 'trends-app__heading';
  const title = document.createElement('h1');
  title.className = 'trends-app__title';
  title.textContent = 'Trends Analytics';
  const tagline = document.createElement('p');
  tagline.className = 'trends-app__tagline';
  tagline.textContent = 'Momentum, payouts, and signals across all niches.';
  heading.append(title, tagline);

  header.append(heading, createToolbar());

  const overview = document.createElement('section');
  overview.className = 'trends-overview';
  overview.append(
    createOverviewCard('🔥', 'Top Boost Today', 'topBoost'),
    createOverviewCard('📉', 'Biggest Drop Today', 'biggestDrop'),
    createOverviewCard('💰', 'Best Payout Multiplier', 'bestPayout'),
    createOverviewCard('🕒', 'Active Niches Count', 'activeCount')
  );

  const gridSection = document.createElement('section');
  gridSection.className = 'trends-grid-section';
  const gridHeader = document.createElement('header');
  gridHeader.className = 'trends-grid-section__header';
  const gridTitle = document.createElement('h2');
  gridTitle.textContent = 'Trend Grid';
  const gridMeta = document.createElement('p');
  gridMeta.className = 'trends-grid-section__meta';
  gridMeta.textContent = 'Scanning niches for daily movement.';
  refs.grid.meta = gridMeta;
  gridHeader.append(gridTitle, gridMeta);
  const grid = document.createElement('div');
  grid.className = 'trends-grid';
  refs.grid.container = grid;
  const empty = document.createElement('p');
  empty.className = 'trends-grid__empty';
  refs.grid.empty = empty;
  const footer = document.createElement('p');
  footer.className = 'trends-grid__footer';
  refs.grid.footer = footer;
  gridSection.append(gridHeader, grid, footer);

  const watchlistSection = document.createElement('section');
  watchlistSection.className = 'trends-watchlist';
  refs.watchlist.section = watchlistSection;
  const watchlistHeader = document.createElement('header');
  watchlistHeader.className = 'trends-watchlist__header';
  const watchlistTitle = document.createElement('h2');
  watchlistTitle.textContent = 'Watchlist';
  const watchlistMeta = document.createElement('p');
  watchlistMeta.className = 'trends-watchlist__meta';
  watchlistMeta.textContent = 'Pinned niches surface extra payout details.';
  refs.watchlist.meta = watchlistMeta;
  watchlistHeader.append(watchlistTitle, watchlistMeta);
  const watchlistGrid = document.createElement('div');
  watchlistGrid.className = 'trends-watchlist__grid';
  refs.watchlist.container = watchlistGrid;
  const watchlistEmpty = document.createElement('p');
  watchlistEmpty.className = 'trends-watchlist__empty';
  watchlistEmpty.textContent = 'Star niches to pin them here.';
  refs.watchlist.empty = watchlistEmpty;
  watchlistSection.append(watchlistHeader, watchlistGrid);

  const footerNote = document.createElement('footer');
  footerNote.className = 'trends-app__footer';
  footerNote.textContent = 'Trend signals are updated daily based on game economy.';
  refs.footerNote = footerNote;

  container.append(header, overview, gridSection, watchlistSection, footerNote);
  container.addEventListener('click', handleRootClick);
}

function normalizeModel(model = {}) {
  const highlights = model.highlights || {};
  const entries = Array.isArray(model?.board?.entries)
    ? model.board.entries.map(entry => ({
        ...entry,
        popularity: { ...(entry.popularity || {}) },
        definition: { ...(entry.definition || {}) },
        assetBreakdown: Array.isArray(entry?.assetBreakdown)
          ? entry.assetBreakdown.map(item => ({ ...item }))
          : []
      }))
    : [];
  const watchlistCount = Number.isFinite(model.watchlistCount)
    ? model.watchlistCount
    : entries.filter(entry => entry.watchlisted).length;
  const emptyMessages = model?.board?.emptyMessages || {};
  return { highlights, entries, watchlistCount, emptyMessages };
}

function createStat(label, value) {
  const stat = document.createElement('div');
  stat.className = 'trends-card__stat';
  const labelEl = document.createElement('span');
  labelEl.className = 'trends-card__stat-label';
  labelEl.textContent = label;
  const valueEl = document.createElement('span');
  valueEl.className = 'trends-card__stat-value';
  valueEl.textContent = value;
  stat.append(labelEl, valueEl);
  return stat;
}

function createWatchlistButton(entry) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'trends-card__watch';
  button.dataset.trendsAction = 'watchlist';
  button.dataset.niche = entry.id;
  const watched = entry.watchlisted === true;
  button.setAttribute('aria-pressed', String(watched));
  button.title = watched ? 'Remove from watchlist' : 'Add to watchlist';
  button.textContent = watched ? '★' : '☆';
  return button;
}

function createTrendCard(entry, { variant = 'grid' } = {}) {
  const card = document.createElement('article');
  card.className = 'trends-card';
  card.dataset.niche = entry.id;
  card.dataset.watchlisted = entry.watchlisted ? 'true' : 'false';

  const header = document.createElement('header');
  header.className = 'trends-card__header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'trends-card__title';
  const name = document.createElement('h3');
  name.className = 'trends-card__name';
  name.textContent = entry.definition?.name || 'Untitled niche';
  const score = document.createElement('span');
  score.className = 'trends-card__score';
  const scoreValue = clampScore(entry.popularity?.score);
  score.textContent = scoreValue !== null ? `${scoreValue}` : '–';
  titleWrap.append(name, score);

  header.append(titleWrap, createWatchlistButton(entry));
  card.appendChild(header);

  card.appendChild(buildSparkline(entry.popularity));

  const stats = document.createElement('div');
  stats.className = 'trends-card__stats';
  const deltaText = describeDelta(entry.popularity);
  const multiplier = Number(entry.popularity?.multiplier) || 1;
  const payoutPercent = formatPercent(multiplier - 1);
  stats.append(
    createStat('Momentum delta', deltaText),
    createStat('Payout multiplier', payoutPercent)
  );
  card.appendChild(stats);

  if (variant === 'watchlist') {
    const extra = document.createElement('div');
    extra.className = 'trends-card__extra';
    const avg = createStat('Last 7d average payout', formatCurrency(entry.baselineEarnings || 0));
    const trend = createStat('Current momentum trend', describeTrend(entry.popularity));
    extra.append(avg, trend);
    card.appendChild(extra);
  }

  const ventures = Number(entry.assetCount) || 0;
  const earnings = Number(entry.netEarnings) || 0;
  const empire = document.createElement('p');
  empire.className = 'trends-card__empire';
  empire.textContent = ventures
    ? `${ventures} active venture${ventures === 1 ? '' : 's'} • ${formatCurrency(earnings)} earned today`
    : entry.watchlisted
    ? 'Pinned for quick pivots.'
    : 'No ventures assigned yet.';
  card.appendChild(empire);

  return card;
}

function applyFilters(entries = []) {
  const search = filterState.search;
  return entries.filter(entry => {
    if (filterState.view === 'watchlist' && !entry.watchlisted) {
      return false;
    }
    if (search) {
      const name = String(entry.definition?.name || '').toLowerCase();
      if (!name.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

function sortEntries(entries = []) {
  const sorters = {
    momentum: (a, b) => {
      const scoreA = clampScore(a.popularity?.score) || 0;
      const scoreB = clampScore(b.popularity?.score) || 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const deltaA = Number(a.popularity?.delta) || 0;
      const deltaB = Number(b.popularity?.delta) || 0;
      return deltaB - deltaA;
    },
    name: (a, b) => {
      const nameA = String(a.definition?.name || '').toLowerCase();
      const nameB = String(b.definition?.name || '').toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      const scoreA = clampScore(a.popularity?.score) || 0;
      const scoreB = clampScore(b.popularity?.score) || 0;
      return scoreB - scoreA;
    },
    payout: (a, b) => {
      const impactA = Number(a.trendImpact) || 0;
      const impactB = Number(b.trendImpact) || 0;
      if (impactB !== impactA) return impactB - impactA;
      const multiplierA = Number(a.popularity?.multiplier) || 1;
      const multiplierB = Number(b.popularity?.multiplier) || 1;
      return multiplierB - multiplierA;
    },
    cooling: (a, b) => {
      const deltaA = Number(a.popularity?.delta) || 0;
      const deltaB = Number(b.popularity?.delta) || 0;
      if (deltaA !== deltaB) return deltaA - deltaB;
      const impactA = Number(a.trendImpact) || 0;
      const impactB = Number(b.trendImpact) || 0;
      return impactA - impactB;
    }
  };

  const sorter = sorters[filterState.sort] || sorters.momentum;
  return entries.slice().sort(sorter);
}

function renderGrid(entries = []) {
  if (!refs.grid.container) return;
  refs.grid.container.innerHTML = '';

  if (!entries.length) {
    refs.grid.empty.textContent = DEFAULT_EMPTY_MESSAGE;
    refs.grid.container.appendChild(refs.grid.empty);
    if (refs.grid.footer) {
      refs.grid.footer.textContent = '';
    }
    if (refs.grid.meta) {
      const viewLabel = filterState.view === 'watchlist'
        ? 'Watchlist view. Add stars to populate this grid.'
        : 'Adjust search or sorting to explore more niches.';
      refs.grid.meta.textContent = viewLabel;
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  entries.forEach(entry => {
    fragment.appendChild(createTrendCard(entry));
  });
  refs.grid.container.appendChild(fragment);

  if (refs.grid.meta) {
    const count = entries.length;
    const sortLabel = SORT_OPTIONS.find(option => option.key === filterState.sort)?.label || 'Highest Momentum';
    const viewLabel = filterState.view === 'watchlist' ? 'Watchlist view' : 'All niches';
    const rawSearch = filterState.rawSearch.trim();
    const searchNote = rawSearch ? ` • “${rawSearch}”` : '';
    refs.grid.meta.textContent = `${count} niche${count === 1 ? '' : 's'} • ${sortLabel} • ${viewLabel}${searchNote}`;
  }

  if (refs.grid.footer) {
    const totalVentures = entries.reduce((sum, entry) => sum + (Number(entry.assetCount) || 0), 0);
    const totalEarnings = entries.reduce((sum, entry) => sum + (Number(entry.netEarnings) || 0), 0);
    const ventureLabel = totalVentures === 1 ? 'venture' : 'ventures';
    refs.grid.footer.textContent = `Your empire: ${totalVentures} active ${ventureLabel}, ${formatCurrency(totalEarnings)} earned today.`;
  }
}

function renderWatchlist(entries = []) {
  if (!refs.watchlist.container) return;
  const watchlisted = entries.filter(entry => entry.watchlisted);
  refs.watchlist.container.innerHTML = '';

  if (refs.watchlist.meta) {
    const count = watchlisted.length;
    refs.watchlist.meta.textContent = count
      ? `${count} niche${count === 1 ? '' : 's'} pinned.`
      : 'Pinned niches surface extra payout details.';
  }

  if (!watchlisted.length) {
    refs.watchlist.container.appendChild(refs.watchlist.empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  watchlisted.forEach(entry => {
    fragment.appendChild(createTrendCard(entry, { variant: 'watchlist' }));
  });
  refs.watchlist.container.appendChild(fragment);
}

function updateToolbarState() {
  if (!refs.header) return;

  if (refs.header.sortSelect) {
    refs.header.sortSelect.value = filterState.sort;
  }

  if (refs.header.searchInput) {
    refs.header.searchInput.value = filterState.rawSearch;
  }

  const watchlistCount = getWatchlistCount();
  const buttons = refs.header.viewButtons || {};
  Object.keys(buttons).forEach(view => {
    const button = buttons[view];
    if (!button) return;
    const isActive = filterState.view === view;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
    if (view === 'watchlist') {
      const disabled = watchlistCount === 0;
      button.disabled = disabled;
      button.title = disabled ? 'Add niches to your watchlist to enable this view.' : '';
      if (disabled && filterState.view === 'watchlist') {
        filterState.view = 'all';
      }
    }
  });
}

function renderContent() {
  const currentModel = getCurrentModel();
  if (!currentModel) return;
  if (currentModel.watchlistCount === 0 && filterState.view === 'watchlist') {
    filterState.view = 'all';
  }
  updateToolbarState();
  updateOverview(currentModel.entries, refs.overview, {
    formatPercent,
    formatSignedCurrency
  });
  const filtered = applyFilters(currentModel.entries);
  const sorted = sortEntries(filtered);
  renderGrid(sorted);
  renderWatchlist(currentModel.entries);
}

function createMeta(model = {}) {
  const entries = Array.isArray(model.entries) ? model.entries : [];
  if (!entries.length) {
    return 'Trend scan ready';
  }
  const watched = entries.filter(entry => entry.watchlisted).length;
  if (watched) {
    return `${entries.length} niches • ${watched} starred`;
  }
  return `${entries.length} niches tracked`;
}

function handleRootClick(event) {
  const button = event.target.closest('[data-trends-action]');
  if (!button) return;
  const action = button.dataset.trendsAction;
  const nicheId = button.dataset.niche;
  if (action !== 'watchlist' || !nicheId) return;
  event.preventDefault();
  const shouldWatch = button.getAttribute('aria-pressed') !== 'true';
  setNicheWatchlist(nicheId, shouldWatch);
  updateEntryWatchlist(nicheId, shouldWatch);
  renderContent();
}

function render(model = {}, context = {}) {
  const { mount } = context;
  if (!mount) {
    return { meta: 'Trend scan ready' };
  }
  ensureRoot(mount, buildLayout);
  setCurrentModel(normalizeModel(model));
  renderContent();
  return { meta: createMeta(getCurrentModel()) };
}

export default { render };
