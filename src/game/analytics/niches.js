import { getState, getAssetState } from '../../core/state.js';
import { NICHE_ANALYTICS_HISTORY_LIMIT } from '../../core/state/niches.js';
import { getAssets } from '../registryService.js';
import { ensureNicheState, getNicheRoster, getNicheWatchlist } from '../assets/niches.js';

function roundCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100) / 100;
}

function clampScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeHistorySeries(history) {
  if (!Array.isArray(history)) return [];
  return history
    .map(clampScore)
    .filter(value => value !== null)
    .slice(-NICHE_ANALYTICS_HISTORY_LIMIT);
}

function buildPopularityHistory(state, id, popularity = {}) {
  const snapshots = Array.isArray(state?.niches?.analyticsHistory)
    ? state.niches.analyticsHistory
    : [];

  const history = snapshots
    .map(snapshot => {
      if (!snapshot || !Array.isArray(snapshot.analytics)) return null;
      const entry = snapshot.analytics.find(item => item?.id === id);
      if (!entry) return null;
      return clampScore(entry.popularity?.score);
    })
    .filter(value => value !== null);

  const currentScore = clampScore(popularity.score);
  if (currentScore !== null) {
    history.push(currentScore);
  }

  if (history.length === 0) {
    const previousScore = clampScore(popularity.previousScore);
    if (previousScore !== null) {
      history.push(previousScore);
    }
  }

  const maxLength = NICHE_ANALYTICS_HISTORY_LIMIT;
  return history.length > maxLength ? history.slice(-maxLength) : history;
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

function buildAnalyticsSeed(roster = [], watchlist = new Set()) {
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
  return stats;
}

export function collectNicheAnalytics(state = getState()) {
  const roster = getNicheRoster(state) || [];
  const watchlist = getNicheWatchlist(state);
  const stats = buildAnalyticsSeed(roster, watchlist);

  getAssets().forEach(asset => {
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
    const assetBreakdown = Array.from(entry.assetBreakdown.entries()).map(([name, count]) => ({
      name,
      count: Number.isFinite(count) ? count : 0
    }));
    const popularity = entry.popularity || {};
    return {
      ...entry,
      assetBreakdown,
      netEarnings: roundCurrency(entry.netEarnings),
      trendImpact: roundCurrency(entry.trendImpact),
      baselineEarnings: roundCurrency(entry.baselineEarnings),
      status: describeTrendStatus(entry),
      popularity: {
        score: popularity.score,
        previousScore: popularity.previousScore,
        delta: popularity.delta,
        multiplier: popularity.multiplier,
        history: buildPopularityHistory(state, entry.id, popularity)
      }
    };
  });
}

function createHighlightDetail(entry) {
  if (!entry) return null;
  const multiplier = Number(entry.popularity?.multiplier);
  return {
    id: entry.id,
    name: entry.definition?.name || 'Untitled niche',
    assetCount: Number(entry.assetCount) || 0,
    netEarnings: Number(entry.netEarnings) || 0,
    trendImpact: Number(entry.trendImpact) || 0,
    multiplier: Number.isFinite(multiplier) ? multiplier : 1,
    delta: Number(entry.popularity?.delta),
    score: clampScore(entry.popularity?.score)
  };
}

export function summarizeNicheHighlights(analytics = []) {
  const defaults = { hot: null, swing: null, risk: null };
  if (!Array.isArray(analytics) || analytics.length === 0) {
    return defaults;
  }

  const invested = analytics.filter(entry => entry.assetCount > 0);
  const relevant = invested.length ? invested : analytics;
  const topImpact = relevant
    .slice()
    .sort((a, b) => Math.abs(Number(b.trendImpact) || 0) - Math.abs(Number(a.trendImpact) || 0))[0];
  const fastestMove = analytics
    .slice()
    .sort((a, b) => Math.abs(Number(b.popularity?.delta) || 0) - Math.abs(Number(a.popularity?.delta) || 0))[0];
  const negativePool = relevant.filter(entry => Number(entry.trendImpact) < 0);
  const biggestLoss = negativePool
    .slice()
    .sort((a, b) => Number(a.trendImpact) - Number(b.trendImpact))[0];

  return {
    hot: createHighlightDetail(topImpact),
    swing: createHighlightDetail(fastestMove),
    risk: createHighlightDetail(biggestLoss)
  };
}

function sanitizeAnalyticsEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = typeof entry.id === 'string' ? entry.id : null;
  if (!id) return null;
  const detail = createHighlightDetail(entry);
  const popularity = entry.popularity || {};
  const history = sanitizeHistorySeries(popularity.history);
  return {
    id,
    definition: {
      id,
      name: detail?.name || 'Untitled niche'
    },
    watchlisted: entry.watchlisted === true,
    assetCount: Number(detail?.assetCount) || 0,
    netEarnings: roundCurrency(detail?.netEarnings),
    trendImpact: roundCurrency(detail?.trendImpact),
    baselineEarnings: roundCurrency(entry.baselineEarnings),
    popularity: {
      score: detail?.score,
      previousScore: clampScore(popularity.previousScore),
      delta: Number.isFinite(detail?.delta) ? detail.delta : null,
      multiplier: Number.isFinite(detail?.multiplier) ? detail.multiplier : 1,
      history
    },
    assetBreakdown: Array.isArray(entry.assetBreakdown)
      ? entry.assetBreakdown.map(item => ({
          name: item?.name || 'Asset',
          count: Number.isFinite(item?.count) ? Number(item.count) : 0
        }))
      : [],
    status: entry.status || describeTrendStatus(entry)
  };
}

function sanitizeHighlightSnapshot(detail) {
  if (!detail) return null;
  return {
    id: typeof detail.id === 'string' ? detail.id : null,
    name: detail.name || 'Untitled niche',
    assetCount: Number(detail.assetCount) || 0,
    netEarnings: roundCurrency(detail.netEarnings),
    trendImpact: roundCurrency(detail.trendImpact),
    multiplier: Number.isFinite(detail.multiplier) ? detail.multiplier : 1,
    delta: Number.isFinite(detail.delta) ? detail.delta : null,
    score: clampScore(detail.score)
  };
}

export function archiveNicheAnalytics({ state = getState(), day, timestamp } = {}) {
  const target = state || getState();
  if (!target) return;
  const nicheState = ensureNicheState(target);
  if (!nicheState) return;

  const analytics = collectNicheAnalytics(target);
  const highlights = summarizeNicheHighlights(analytics);

  const snapshot = {
    id: `niche-history:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
    day: Number.isFinite(day) ? day : Number(target.day) || 1,
    recordedAt: Number.isFinite(timestamp) ? timestamp : Date.now(),
    analytics: analytics.map(sanitizeAnalyticsEntry).filter(Boolean),
    highlights: {
      hot: sanitizeHighlightSnapshot(highlights.hot),
      swing: sanitizeHighlightSnapshot(highlights.swing),
      risk: sanitizeHighlightSnapshot(highlights.risk)
    }
  };

  nicheState.analyticsHistory = Array.isArray(nicheState.analyticsHistory)
    ? nicheState.analyticsHistory
    : [];
  nicheState.analyticsHistory.push(snapshot);
  while (nicheState.analyticsHistory.length > NICHE_ANALYTICS_HISTORY_LIMIT) {
    nicheState.analyticsHistory.shift();
  }
}

