import {
  getAssetGallery,
  getNicheTrends,
  getSessionStatusNode,
  getShellNavigation
} from './elements/registry.js';
import { formatMoney } from '../core/helpers.js';
import { getAssetState, getState } from '../core/state.js';
import { registry } from '../game/registry.js';
import { instanceLabel } from '../game/assets/helpers.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../game/requirements.js';
import { getNicheRoster, getNicheWatchlist, setNicheWatchlist } from '../game/assets/niches.js';
import { activateShellPanel } from './layout.js';
import { buildDashboardViewModel } from './dashboard/model.js';
import { getActiveView } from './viewManager.js';

export { buildDashboardViewModel } from './dashboard/model.js';

const nicheViewState = {
  sort: 'impact',
  investedOnly: false,
  watchlistOnly: false
};
let nicheControlsBound = false;
let assetHighlightTimer = null;

function refreshNicheWidget() {
  const state = getState();
  if (state) {
    renderNicheWidget(state);
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
      refreshNicheWidget();
    });
  });
  refs.filterInvested?.addEventListener('change', event => {
    nicheViewState.investedOnly = Boolean(event.target?.checked);
    refreshNicheWidget();
  });
  refs.filterWatchlist?.addEventListener('change', event => {
    nicheViewState.watchlistOnly = Boolean(event.target?.checked);
    refreshNicheWidget();
  });
  nicheControlsBound = true;
}

function updateNicheControlStates({ watchlistCount = 0 } = {}) {
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

function buildNicheAnalytics(state) {
  const roster = getNicheRoster(state) || [];
  const watchlist = getNicheWatchlist(state);
  const stats = new Map();
  roster.forEach(entry => {
    const id = entry?.definition?.id;
    if (!id) return;
    stats.set(id, {
      id,
      definition: entry.definition,
      popularity: entry.popularity || {},
      watchlisted: watchlist.has(id),
      assetCount: 0,
      netEarnings: 0,
      trendImpact: 0,
      baselineEarnings: 0,
      assetBreakdown: new Map()
    });
  });

  registry.assets.forEach(asset => {
    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach(instance => {
      if (!instance) return;
      const nicheId = typeof instance.nicheId === 'string' ? instance.nicheId : null;
      if (!nicheId) return;
      const target = stats.get(nicheId);
      if (!target) return;
      target.assetCount += 1;
      const label = asset.singular || asset.name || 'Asset';
      target.assetBreakdown.set(label, (target.assetBreakdown.get(label) || 0) + 1);

      const breakdownData = instance.lastIncomeBreakdown;
      const total = Number(breakdownData?.total);
      const payout = Number.isFinite(total) ? total : Number(instance.lastIncome);
      const actual = Math.max(0, Number.isFinite(payout) ? payout : 0);
      const entries = Array.isArray(breakdownData?.entries) ? breakdownData.entries : [];
      const trendDelta = entries.reduce((sum, item) => {
        if (!item || item.type !== 'niche') return sum;
        const amount = Number(item.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);
      const baseline = actual - trendDelta;
      target.netEarnings += actual;
      target.trendImpact += trendDelta;
      target.baselineEarnings += Math.max(0, baseline);
    });
  });

  return Array.from(stats.values()).map(entry => {
    const assetBreakdown = Array.from(entry.assetBreakdown.entries()).map(([name, count]) => ({ name, count }));
    return {
      ...entry,
      assetBreakdown,
      netEarnings: Math.round(entry.netEarnings * 100) / 100,
      trendImpact: Math.round(entry.trendImpact * 100) / 100,
      baselineEarnings: Math.round(entry.baselineEarnings * 100) / 100,
      status: describeTrendStatus(entry)
    };
  });
}

function focusAssetsForNiche(nicheId, { hasAssets = false, nicheName = '' } = {}) {
  if (!nicheId) return;
  activateShellPanel('panel-ventures');
  const assetGallery = getAssetGallery();
  const sessionStatus = getSessionStatusNode();
  if (!assetGallery) return;
  window.requestAnimationFrame(() => {
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
  status.textContent = entry.status || 'Steady';
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

function updateDailyHighlights(analytics, refs) {
  const {
    highlightHot,
    highlightHotNote,
    highlightSwing,
    highlightSwingNote,
    highlightRisk,
    highlightRiskNote
  } = refs;

  const invested = analytics.filter(entry => entry.assetCount > 0);
  const relevant = invested.length ? invested : analytics;
  const topImpact = relevant.slice().sort((a, b) => Math.abs(b.trendImpact) - Math.abs(a.trendImpact))[0];
  const fastestMove = analytics.slice().sort((a, b) => Math.abs(Number(b.popularity?.delta) || 0) - Math.abs(Number(a.popularity?.delta) || 0))[0];
  const negativePool = (invested.length ? invested : analytics).filter(entry => entry.trendImpact < 0);
  const biggestLoss = negativePool.sort((a, b) => a.trendImpact - b.trendImpact)[0];

  if (!topImpact) {
    if (highlightHot) highlightHot.textContent = 'No readings yet';
    if (highlightHotNote) highlightHotNote.textContent = 'Assign a niche to start tracking buzz.';
  } else {
    const impactValue = Math.abs(topImpact.trendImpact);
    const isPositive = topImpact.trendImpact >= 0;
    const impactLabel = impactValue >= 0.5
      ? `${isPositive ? '+' : '-'}$${formatMoney(impactValue)} trend ${isPositive ? 'boost' : 'drag'}`
      : `${formatPercent((Number(topImpact.popularity?.multiplier) || 1) - 1)} payouts`;
    if (highlightHot) {
      highlightHot.textContent = `${topImpact.definition?.name || 'Untitled niche'} • ${impactLabel}`;
    }
    if (highlightHotNote) {
      if (topImpact.assetCount > 0) {
        const payoutText = `$${formatMoney(Math.max(0, topImpact.netEarnings))}`;
        highlightHotNote.textContent = `Your ${topImpact.assetCount} venture${topImpact.assetCount === 1 ? '' : 's'} made ${payoutText} today with ${formatPercent((Number(topImpact.popularity?.multiplier) || 1) - 1)} payouts.`;
      } else {
        highlightHotNote.textContent = `Queue a venture to capture ${formatPercent((Number(topImpact.popularity?.multiplier) || 1) - 1)} payouts from this niche.`;
      }
    }
  }

  if (!fastestMove || !Number.isFinite(Number(fastestMove.popularity?.delta))) {
    if (highlightSwing) highlightSwing.textContent = 'Awaiting data';
    if (highlightSwingNote) highlightSwingNote.textContent = 'Fresh deltas will appear after the first reroll.';
  } else {
    if (highlightSwing) {
      const deltaText = describeDelta(fastestMove.popularity);
      highlightSwing.textContent = `${fastestMove.definition?.name || 'Untitled niche'} • ${deltaText}`;
    }
    if (highlightSwingNote) {
      const score = clampScore(fastestMove.popularity?.score);
      const payoutText = formatPercent((Number(fastestMove.popularity?.multiplier) || 1) - 1);
      const scoreText = score !== null ? `score ${score}` : 'score pending';
      highlightSwingNote.textContent = `${payoutText} payouts • ${scoreText}.`;
    }
  }

  if (!biggestLoss) {
    if (highlightRisk) highlightRisk.textContent = 'All calm';
    if (highlightRiskNote) highlightRiskNote.textContent = 'We’ll flag niches that are cooling off fast.';
  } else {
    const lossValue = Math.abs(biggestLoss.trendImpact);
    if (highlightRisk) {
      highlightRisk.textContent = `${biggestLoss.definition?.name || 'Untitled niche'} • -$${formatMoney(lossValue)} trend drag`;
    }
    if (highlightRiskNote) {
      if (biggestLoss.assetCount > 0) {
        highlightRiskNote.textContent = `${biggestLoss.assetCount} venture${biggestLoss.assetCount === 1 ? '' : 's'} lost ${formatPercent((Number(biggestLoss.popularity?.multiplier) || 1) - 1)} vs baseline today.`;
      } else {
        highlightRiskNote.textContent = 'No ventures invested yet, so you are safe from this downswing.';
      }
    }
  }
}

function renderNicheWidget(state) {
  const refs = getNicheTrends() || {};
  const {
    highlightHot,
    highlightHotNote,
    highlightSwing,
    highlightSwingNote,
    highlightRisk,
    highlightRiskNote,
    board
  } = refs;

  setupNicheControls();

  const analytics = buildNicheAnalytics(state);
  if (!analytics.length) {
    if (highlightHot) highlightHot.textContent = 'No readings yet';
    if (highlightHotNote) highlightHotNote.textContent = 'Assign a niche to start tracking buzz.';
    if (highlightSwing) highlightSwing.textContent = 'Awaiting data';
    if (highlightSwingNote) highlightSwingNote.textContent = 'Fresh deltas will appear after the first reroll.';
    if (highlightRisk) highlightRisk.textContent = 'All calm';
    if (highlightRiskNote) highlightRiskNote.textContent = 'We’ll flag niches that are cooling off fast.';
    if (board) {
      board.innerHTML = '';
      const empty = document.createElement('p');
      empty.className = 'niche-board__empty';
      empty.textContent = 'Assign a niche to a venture to start tracking demand swings.';
      board.appendChild(empty);
    }
    updateNicheControlStates({ watchlistCount: 0 });
    return;
  }

  const watchlistCount = analytics.filter(entry => entry.watchlisted).length;
  updateNicheControlStates({ watchlistCount });

  updateDailyHighlights(analytics, {
    highlightHot,
    highlightHotNote,
    highlightSwing,
    highlightSwingNote,
    highlightRisk,
    highlightRiskNote
  });

  let entries = analytics.slice();
  if (nicheViewState.watchlistOnly) {
    entries = entries.filter(entry => entry.watchlisted);
  }
  if (nicheViewState.investedOnly) {
    entries = entries.filter(entry => entry.assetCount > 0);
  }

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
  entries.sort(sorter);

  if (board) {
    board.innerHTML = '';
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'niche-board__empty';
      if (nicheViewState.watchlistOnly) {
        empty.textContent = 'No watchlisted niches match the current filters.';
      } else if (nicheViewState.investedOnly) {
        empty.textContent = 'You haven’t assigned any assets that fit this filter yet.';
      } else {
        empty.textContent = 'Assign a niche to a venture to start tracking demand swings.';
      }
      board.appendChild(empty);
    } else {
      const fragment = document.createDocumentFragment();
      entries.forEach(entry => {
        const card = createNicheCard(entry);
        if (card) fragment.appendChild(card);
      });
      board.appendChild(fragment);
    }
  }
}

export function renderDashboard(state, summary, presenter) {
  const currentState = state ?? getState();
  if (!currentState) return;

  const viewModel = buildDashboardViewModel(currentState, summary);
  if (!viewModel) return;

  const activePresenter = presenter ?? getActiveView()?.presenters?.dashboard;
  if (activePresenter?.renderDashboard) {
    activePresenter.renderDashboard(viewModel, { state: currentState, summary });
  }

  renderNicheWidget(currentState);
}
