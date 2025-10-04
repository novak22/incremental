import { SORT_OPTIONS } from '../filters.js';
import { clampScore, buildSparkline } from '../sparkline.js';

const DEFAULT_EMPTY_MESSAGE = 'No niches match your filters yet.';

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

function createTrendCard(entry, { formatCurrency, formatPercent, variant = 'grid' } = {}) {
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
  const payoutPercent = formatPercent ? formatPercent(multiplier - 1) : String(multiplier - 1);
  stats.append(
    createStat('Momentum delta', deltaText),
    createStat('Payout multiplier', payoutPercent)
  );
  card.appendChild(stats);

  if (variant === 'watchlist') {
    const extra = document.createElement('div');
    extra.className = 'trends-card__extra';
    const avgValue = formatCurrency ? formatCurrency(entry.baselineEarnings || 0) : String(entry.baselineEarnings || 0);
    const avg = createStat('Last 7d average payout', avgValue);
    const trend = createStat('Current momentum trend', describeTrend(entry.popularity));
    extra.append(avg, trend);
    card.appendChild(extra);
  }

  const ventures = Number(entry.assetCount) || 0;
  const earnings = Number(entry.netEarnings) || 0;
  const empire = document.createElement('p');
  empire.className = 'trends-card__empire';
  const earningsText = formatCurrency ? formatCurrency(earnings) : String(earnings);
  empire.textContent = ventures
    ? `${ventures} active venture${ventures === 1 ? '' : 's'} • ${earningsText} earned today`
    : entry.watchlisted
    ? 'Pinned for quick pivots.'
    : 'No ventures assigned yet.';
  card.appendChild(empire);

  return card;
}

export function renderGrid(entries = [], { refs, filterState, formatCurrency, formatPercent }) {
  if (!refs?.grid?.container) return;
  refs.grid.container.innerHTML = '';

  if (!entries.length) {
    if (refs.grid.empty) {
      refs.grid.empty.textContent = DEFAULT_EMPTY_MESSAGE;
      refs.grid.container.appendChild(refs.grid.empty);
    }
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
    fragment.appendChild(createTrendCard(entry, { formatCurrency, formatPercent }));
  });
  refs.grid.container.appendChild(fragment);

  if (refs.grid.meta) {
    const count = entries.length;
    const sortLabel = SORT_OPTIONS.find(option => option.key === filterState.sort)?.label || 'Highest Momentum';
    const viewLabel = filterState.view === 'watchlist' ? 'Watchlist view' : 'All niches';
    const rawSearch = (filterState.rawSearch || '').trim();
    const searchNote = rawSearch ? ` • “${rawSearch}”` : '';
    refs.grid.meta.textContent = `${count} niche${count === 1 ? '' : 's'} • ${sortLabel} • ${viewLabel}${searchNote}`;
  }

  if (refs.grid.footer) {
    const totalVentures = entries.reduce((sum, entry) => sum + (Number(entry.assetCount) || 0), 0);
    const totalEarnings = entries.reduce((sum, entry) => sum + (Number(entry.netEarnings) || 0), 0);
    const ventureLabel = totalVentures === 1 ? 'venture' : 'ventures';
    const earningsText = formatCurrency ? formatCurrency(totalEarnings) : String(totalEarnings);
    refs.grid.footer.textContent = `Your empire: ${totalVentures} active ${ventureLabel}, ${earningsText} earned today.`;
  }
}

export function renderWatchlist(entries = [], { refs, formatCurrency, formatPercent }) {
  if (!refs?.watchlist?.container) return;
  const watchlisted = entries.filter(entry => entry.watchlisted);
  refs.watchlist.container.innerHTML = '';

  if (refs.watchlist.meta) {
    const count = watchlisted.length;
    refs.watchlist.meta.textContent = count
      ? `${count} niche${count === 1 ? '' : 's'} pinned.`
      : 'Pinned niches surface extra payout details.';
  }

  if (!watchlisted.length) {
    if (refs.watchlist.empty) {
      refs.watchlist.container.appendChild(refs.watchlist.empty);
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  watchlisted.forEach(entry => {
    fragment.appendChild(
      createTrendCard(entry, { formatCurrency, formatPercent, variant: 'watchlist' })
    );
  });
  refs.watchlist.container.appendChild(fragment);
}
