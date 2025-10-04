import { SORT_OPTIONS } from './filters.js';

function createOverviewCard(refs, icon, label, key) {
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

function createToolbar({ refs, filterState, onFiltersChanged }) {
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
    const value = event.target.value;
    filterState.rawSearch = value;
    filterState.search = value.trim().toLowerCase();
    onFiltersChanged?.();
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
    onFiltersChanged?.();
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
      onFiltersChanged?.();
    });
    refs.header.viewButtons[view] = button;
    toggleGroup.appendChild(button);
  });

  toolbar.append(searchLabel, sortLabel, toggleGroup);
  return toolbar;
}

export function createLayoutBuilder({ refs, filterState, onFiltersChanged, onAction }) {
  return function buildLayout(container) {
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

    header.append(heading, createToolbar({ refs, filterState, onFiltersChanged }));

    const overview = document.createElement('section');
    overview.className = 'trends-overview';
    overview.append(
      createOverviewCard(refs, '🔥', 'Top Boost Today', 'topBoost'),
      createOverviewCard(refs, '📉', 'Biggest Drop Today', 'biggestDrop'),
      createOverviewCard(refs, '💰', 'Best Payout Multiplier', 'bestPayout'),
      createOverviewCard(refs, '🕒', 'Active Niches Count', 'activeCount')
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

    if (onAction && !container.dataset.trendsActionBound) {
      container.addEventListener('click', onAction);
      container.dataset.trendsActionBound = 'true';
    }
  };
}

export function updateToolbarState(refs, filterState, watchlistCount) {
  if (!refs?.header) return;

  if (refs.header.sortSelect) {
    refs.header.sortSelect.value = filterState.sort;
  }

  if (refs.header.searchInput) {
    refs.header.searchInput.value = filterState.rawSearch || '';
  }

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
