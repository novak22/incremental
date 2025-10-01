import {
  getAssetGallery,
  getNicheTrends,
  getSessionStatusNode
} from '../../elements/registry.js';
import { formatMoney } from '../../../core/helpers.js';
import { activateShellPanel } from '../../layout.js';
import { setNicheWatchlist } from '../../../game/assets/niches.js';

const DEFAULT_EMPTY_MESSAGES = {
  default: 'Assign a niche to a venture to start tracking demand swings.',
  investedOnly: 'You haven’t assigned any assets that fit this filter yet.',
  watchlistOnly: 'No watchlisted niches match the current filters.'
};

const DEFAULT_HIGHLIGHTS = {
  hot: { title: 'No readings yet', note: 'Assign a niche to start tracking buzz.' },
  swing: { title: 'Awaiting data', note: 'Fresh deltas will appear after the first reroll.' },
  risk: { title: 'All calm', note: 'We’ll flag niches that are cooling off fast.' }
};

const nicheViewState = {
  sort: 'impact',
  investedOnly: false,
  watchlistOnly: false
};

let nicheControlsBound = false;
let assetHighlightTimer = null;
let currentViewModel = null;

function clampScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function describeDelta(popularity = {}) {
  const raw = Number(popularity.delta);
  if (!Number.isFinite(raw)) return 'Fresh reading';
  if (raw === 0) return 'Holding steady';
  const sign = raw > 0 ? '+' : '';
  return `${sign}${raw} vs yesterday`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '0%';
  const percent = Math.round(value * 100);
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent}%`;
}

function requestRender() {
  if (!currentViewModel) return;
  renderNicheWidget(currentViewModel);
}

function updateControlStates({ watchlistCount = 0 } = {}) {
  const refs = getNicheTrends() || {};
  const buttons = Array.isArray(refs.sortButtons) ? refs.sortButtons : [];
  buttons.forEach(button => {
    const isActive = (button.dataset.nicheSort || 'impact') === nicheViewState.sort;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  if (refs.filterInvested) {
    refs.filterInvested.checked = nicheViewState.investedOnly;
  }

  if (refs.filterWatchlist) {
    const disabled = watchlistCount === 0;
    refs.filterWatchlist.disabled = disabled;
    if (disabled) {
      refs.filterWatchlist.checked = false;
      refs.filterWatchlist.title = 'Add niches to your watchlist to use this filter.';
      if (nicheViewState.watchlistOnly) {
        nicheViewState.watchlistOnly = false;
      }
    } else {
      refs.filterWatchlist.checked = nicheViewState.watchlistOnly;
      refs.filterWatchlist.title = '';
    }
  }
}

function setupNicheControls() {
  if (nicheControlsBound) return;
  const refs = getNicheTrends() || {};
  const buttons = Array.isArray(refs.sortButtons) ? refs.sortButtons : [];
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const sort = button.dataset.nicheSort || 'impact';
      if (sort === nicheViewState.sort) return;
      nicheViewState.sort = sort;
      requestRender();
    });
  });

  refs.filterInvested?.addEventListener('change', event => {
    nicheViewState.investedOnly = Boolean(event.target?.checked);
    requestRender();
  });

  refs.filterWatchlist?.addEventListener('change', event => {
    nicheViewState.watchlistOnly = Boolean(event.target?.checked);
    requestRender();
  });

  nicheControlsBound = true;
}

function describeTrendStatus(entry) {
  if (!entry) return 'Steady';
  const { popularity = {}, assetCount, watchlisted } = entry;
  if (watchlisted && assetCount === 0) return 'Watchlist';
  const delta = Number(popularity.delta);
  if (Number.isFinite(delta)) {
    if (delta >= 6) return 'Heating Up';
    if (delta <= -6) return 'Cooling Off';
  }
  const score = Number(popularity.score);
  if (Number.isFinite(score)) {
    if (score >= 70) return 'Trending';
    if (score <= 40) return 'Cooling Off';
  }
  return 'Steady';
}

function focusAssetsForNiche(nicheId, { hasAssets = false, nicheName = '' } = {}) {
  if (!nicheId) return;
  activateShellPanel('panel-ventures');
  const assetGallery = getAssetGallery();
  const sessionStatus = getSessionStatusNode();
  if (!assetGallery) return;
  const raf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame
    : (cb => cb());
  raf(() => {
    const cards = Array.from(assetGallery.querySelectorAll('[data-asset]'));
    const matches = cards.filter(card => card.dataset.niche === nicheId);
    cards.forEach(card => card.classList.remove('asset-overview-card--spotlight'));
    if (!matches.length) {
      if (sessionStatus) {
        sessionStatus.textContent = hasAssets
          ? 'No payouts recorded yet. Fund upkeep to roll today\'s earnings.'
          : 'No ventures targeting this niche yet. Open a venture card to assign one.';
      }
      return;
    }
    if (sessionStatus) {
      const label = nicheName || 'this niche';
      sessionStatus.textContent = `Spotlighting ventures tuned to ${label}.`;
    }
    matches.forEach(card => card.classList.add('asset-overview-card--spotlight'));
    const first = matches[0];
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (assetHighlightTimer) clearTimeout(assetHighlightTimer);
    assetHighlightTimer = setTimeout(() => {
      matches.forEach(card => card.classList.remove('asset-overview-card--spotlight'));
    }, 2200);
  });
}

function createNicheCard(entry) {
  if (!entry) return null;
  const card = document.createElement('article');
  card.className = 'niche-card';
  card.setAttribute('role', 'listitem');
  if (entry.popularity?.tone) {
    card.dataset.tone = entry.popularity.tone;
  }
  card.dataset.invested = entry.assetCount > 0 ? 'true' : 'false';
  card.dataset.watchlisted = entry.watchlisted ? 'true' : 'false';

  const header = document.createElement('header');
  header.className = 'niche-card__header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'niche-card__title';

  const name = document.createElement('h4');
  name.className = 'niche-card__name';
  name.textContent = entry.definition?.name || 'Untitled niche';
  titleWrap.appendChild(name);

  const status = document.createElement('span');
  status.className = 'niche-card__status';
  status.textContent = entry.status || describeTrendStatus(entry);
  titleWrap.appendChild(status);

  header.appendChild(titleWrap);

  const score = document.createElement('p');
  score.className = 'niche-card__score';
  const normalizedScore = clampScore(entry.popularity?.score);
  score.textContent = normalizedScore !== null ? normalizedScore : '–';
  header.appendChild(score);

  card.appendChild(header);

  const meter = document.createElement('div');
  meter.className = 'niche-card__meter';
  meter.setAttribute('role', 'progressbar');
  meter.setAttribute('aria-valuemin', '0');
  meter.setAttribute('aria-valuemax', '100');
  meter.setAttribute('aria-valuenow', normalizedScore !== null ? String(normalizedScore) : '0');
  const fill = document.createElement('div');
  fill.className = 'niche-card__meter-fill';
  fill.style.setProperty('--fill', normalizedScore !== null ? `${normalizedScore}%` : '0%');
  meter.appendChild(fill);
  card.appendChild(meter);

  const globalSection = document.createElement('section');
  globalSection.className = 'niche-card__section';
  const globalHeading = document.createElement('h5');
  globalHeading.textContent = 'Global momentum';
  globalSection.appendChild(globalHeading);

  const multiplier = Number(entry.popularity?.multiplier);
  const payoutText = Number.isFinite(multiplier)
    ? (multiplier === 1 ? 'Baseline payouts' : `${formatPercent(multiplier - 1)} payouts`)
    : 'Payout data pending';
  const globalStat = document.createElement('p');
  globalStat.className = 'niche-card__stat';
  globalStat.textContent = payoutText;
  globalSection.appendChild(globalStat);

  const globalNote = document.createElement('p');
  globalNote.className = 'niche-card__note';
  const noteParts = [];
  if (normalizedScore !== null) noteParts.push(`Score ${normalizedScore}`);
  const deltaText = describeDelta(entry.popularity);
  if (deltaText) noteParts.push(deltaText);
  if (entry.popularity?.label) noteParts.push(entry.popularity.label);
  globalNote.textContent = noteParts.join(' • ') || 'Trend scan warming up.';
  globalSection.appendChild(globalNote);

  card.appendChild(globalSection);

  const playerSection = document.createElement('section');
  playerSection.className = 'niche-card__section';
  const playerHeading = document.createElement('h5');
  playerHeading.textContent = 'Your empire';
  playerSection.appendChild(playerHeading);

  const playerStat = document.createElement('p');
  playerStat.className = 'niche-card__stat';
  if (entry.assetCount > 0) {
    playerStat.textContent = entry.assetCount === 1
      ? '1 venture active'
      : `${entry.assetCount} ventures active`;
  } else if (entry.watchlisted) {
    playerStat.textContent = 'On your watchlist';
  } else {
    playerStat.textContent = 'No ventures assigned yet';
  }
  playerSection.appendChild(playerStat);

  const earningsLine = document.createElement('p');
  earningsLine.className = 'niche-card__metric';
  if (entry.assetCount > 0) {
    earningsLine.textContent = entry.netEarnings > 0
      ? `$${formatMoney(entry.netEarnings)} earned today`
      : 'No payouts logged today.';
  } else {
    earningsLine.textContent = 'Assign a venture to tap this trend.';
  }
  playerSection.appendChild(earningsLine);

  if (entry.assetCount > 0) {
    const trendLine = document.createElement('p');
    trendLine.className = 'niche-card__trend';
    if (Math.abs(entry.trendImpact) >= 0.5) {
      const prefix = entry.trendImpact >= 0 ? '+' : '-';
      trendLine.textContent = `${prefix}$${formatMoney(Math.abs(entry.trendImpact))} from today's trend`;
      trendLine.classList.add(entry.trendImpact >= 0 ? 'niche-card__trend--positive' : 'niche-card__trend--negative');
      playerSection.appendChild(trendLine);

      const baselineNote = document.createElement('p');
      baselineNote.className = 'niche-card__note';
      baselineNote.textContent = `Baseline would land around $${formatMoney(entry.baselineEarnings)}.`;
      playerSection.appendChild(baselineNote);
    } else {
      trendLine.textContent = 'Trend impact is neutral today.';
      trendLine.classList.add('niche-card__trend--neutral');
      playerSection.appendChild(trendLine);
    }
  } else if (entry.watchlisted) {
    const watchNote = document.createElement('p');
    watchNote.className = 'niche-card__note';
    watchNote.textContent = 'Keep tabs on this niche and pivot when the hype spikes.';
    playerSection.appendChild(watchNote);
  }

  if (entry.assetBreakdown?.length) {
    const breakdown = document.createElement('p');
    breakdown.className = 'niche-card__note';
    const parts = entry.assetBreakdown.map(({ name, count }) =>
      count > 1 ? `${name} (${count})` : name
    );
    breakdown.textContent = `Assets: ${parts.join(', ')}`;
    playerSection.appendChild(breakdown);
  }

  card.appendChild(playerSection);

  const actions = document.createElement('div');
  actions.className = 'niche-card__actions';

  const viewButton = document.createElement('button');
  viewButton.type = 'button';
  viewButton.className = 'ghost niche-card__action';
  viewButton.textContent = entry.assetCount > 0
    ? 'View ventures in this niche'
    : 'Find ventures for this niche';
  viewButton.addEventListener('click', () => {
    focusAssetsForNiche(entry.id, {
      hasAssets: entry.assetCount > 0,
      nicheName: entry.definition?.name
    });
  });
  actions.appendChild(viewButton);

  const watchlistButton = document.createElement('button');
  watchlistButton.type = 'button';
  watchlistButton.className = 'ghost niche-card__action';
  watchlistButton.textContent = entry.watchlisted ? 'Remove from watchlist' : 'Add to watchlist';
  watchlistButton.setAttribute('aria-pressed', String(entry.watchlisted));
  watchlistButton.addEventListener('click', () => {
    setNicheWatchlist(entry.id, !entry.watchlisted);
  });
  actions.appendChild(watchlistButton);

  const recommendButton = document.createElement('button');
  recommendButton.type = 'button';
  recommendButton.className = 'ghost niche-card__action';
  recommendButton.textContent = 'Queue recommended hustle';
  recommendButton.disabled = true;
  recommendButton.title = 'Coming soon: auto-queue the best hustle for this niche.';
  actions.appendChild(recommendButton);

  card.appendChild(actions);

  return card;
}

function applyHighlights(refs, highlights = DEFAULT_HIGHLIGHTS) {
  const { hot = {}, swing = {}, risk = {} } = highlights;
  if (refs.highlightHot) refs.highlightHot.textContent = hot.title || DEFAULT_HIGHLIGHTS.hot.title;
  if (refs.highlightHotNote) refs.highlightHotNote.textContent = hot.note || DEFAULT_HIGHLIGHTS.hot.note;
  if (refs.highlightSwing) refs.highlightSwing.textContent = swing.title || DEFAULT_HIGHLIGHTS.swing.title;
  if (refs.highlightSwingNote) refs.highlightSwingNote.textContent = swing.note || DEFAULT_HIGHLIGHTS.swing.note;
  if (refs.highlightRisk) refs.highlightRisk.textContent = risk.title || DEFAULT_HIGHLIGHTS.risk.title;
  if (refs.highlightRiskNote) refs.highlightRiskNote.textContent = risk.note || DEFAULT_HIGHLIGHTS.risk.note;
}

function sortEntries(entries = []) {
  const sorters = {
    impact: (a, b) => {
      const impactDiff = Math.abs(b.trendImpact) - Math.abs(a.trendImpact);
      if (impactDiff !== 0) return impactDiff;
      const assetDiff = b.assetCount - a.assetCount;
      if (assetDiff !== 0) return assetDiff;
      return (clampScore(b.popularity?.score) || 0) - (clampScore(a.popularity?.score) || 0);
    },
    assets: (a, b) => {
      const assetDiff = b.assetCount - a.assetCount;
      if (assetDiff !== 0) return assetDiff;
      const impactDiff = Math.abs(b.trendImpact) - Math.abs(a.trendImpact);
      if (impactDiff !== 0) return impactDiff;
      return (clampScore(b.popularity?.score) || 0) - (clampScore(a.popularity?.score) || 0);
    },
    movement: (a, b) => {
      const deltaA = Math.abs(Number(a.popularity?.delta) || 0);
      const deltaB = Math.abs(Number(b.popularity?.delta) || 0);
      if (deltaB !== deltaA) return deltaB - deltaA;
      return Math.abs(b.trendImpact) - Math.abs(a.trendImpact);
    }
  };

  const sorter = sorters[nicheViewState.sort] || sorters.impact;
  return entries.slice().sort(sorter);
}

function filterEntries(entries = []) {
  return entries.filter(entry => {
    if (nicheViewState.watchlistOnly && !entry.watchlisted) {
      return false;
    }
    if (nicheViewState.investedOnly && !(entry.assetCount > 0)) {
      return false;
    }
    return true;
  });
}

function renderBoard(boardNode, entries, emptyMessages = DEFAULT_EMPTY_MESSAGES) {
  if (!boardNode) return;
  boardNode.innerHTML = '';
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'niche-board__empty';
    if (nicheViewState.watchlistOnly) {
      empty.textContent = emptyMessages.watchlistOnly || DEFAULT_EMPTY_MESSAGES.watchlistOnly;
    } else if (nicheViewState.investedOnly) {
      empty.textContent = emptyMessages.investedOnly || DEFAULT_EMPTY_MESSAGES.investedOnly;
    } else {
      empty.textContent = emptyMessages.default || DEFAULT_EMPTY_MESSAGES.default;
    }
    boardNode.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  entries.forEach(entry => {
    const card = createNicheCard(entry);
    if (card) fragment.appendChild(card);
  });
  boardNode.appendChild(fragment);
}

export function renderNicheWidget(viewModel) {
  currentViewModel = viewModel;
  setupNicheControls();
  const refs = getNicheTrends() || {};
  if (!refs) return;

  const highlights = viewModel?.highlights || DEFAULT_HIGHLIGHTS;
  const board = viewModel?.board || { entries: [], emptyMessages: DEFAULT_EMPTY_MESSAGES };
  const watchlistCount = viewModel?.watchlistCount ?? 0;

  updateControlStates({ watchlistCount });
  applyHighlights(refs, highlights);

  const filtered = filterEntries(Array.isArray(board.entries) ? board.entries : []);
  const sorted = sortEntries(filtered);
  renderBoard(refs.board, sorted, board.emptyMessages || DEFAULT_EMPTY_MESSAGES);
}

export default {
  renderNicheWidget
};
