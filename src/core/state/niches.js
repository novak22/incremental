import nicheDefinitions from '../../game/assets/nicheData.js';

export const NICHE_ANALYTICS_HISTORY_LIMIT = 7;

function sanitizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sanitizeOptionalNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sanitizeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function sanitizeBreakdownEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const name = typeof entry.name === 'string' && entry.name ? entry.name : 'Asset';
  const count = sanitizeNumber(entry.count, 0);
  return { name, count };
}

function sanitizeAnalyticsEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = typeof entry.id === 'string' ? entry.id : null;
  if (!id) return null;

  const definitionName = typeof entry.definition?.name === 'string' && entry.definition.name
    ? entry.definition.name
    : 'Untitled niche';

  const popularity = entry.popularity || {};
  const history = Array.isArray(popularity.history)
    ? popularity.history
        .map(sanitizeScore)
        .filter(value => value !== null)
        .slice(-NICHE_ANALYTICS_HISTORY_LIMIT)
    : [];
  const sanitized = {
    id,
    definition: { id, name: definitionName },
    watchlisted: entry.watchlisted === true,
    assetCount: sanitizeNumber(entry.assetCount, 0),
    netEarnings: Math.round(sanitizeNumber(entry.netEarnings, 0) * 100) / 100,
    trendImpact: Math.round(sanitizeNumber(entry.trendImpact, 0) * 100) / 100,
    baselineEarnings: Math.round(sanitizeNumber(entry.baselineEarnings, 0) * 100) / 100,
    popularity: {
      score: sanitizeScore(popularity.score),
      previousScore: sanitizeScore(popularity.previousScore),
      delta: sanitizeOptionalNumber(popularity.delta),
      multiplier: Number.isFinite(Number(popularity.multiplier))
        ? Number(popularity.multiplier)
        : 1,
      history
    },
    assetBreakdown: Array.isArray(entry.assetBreakdown)
      ? entry.assetBreakdown.map(sanitizeBreakdownEntry).filter(Boolean)
      : []
  };

  if (typeof entry.status === 'string' && entry.status) {
    sanitized.status = entry.status;
  }

  return sanitized;
}

function sanitizeHighlightEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = typeof entry.id === 'string' ? entry.id : null;
  const name = typeof entry.name === 'string' && entry.name ? entry.name : 'Untitled niche';
  const multiplier = Number(entry.multiplier);
  return {
    id,
    name,
    assetCount: sanitizeNumber(entry.assetCount, 0),
    netEarnings: Math.round(sanitizeNumber(entry.netEarnings, 0) * 100) / 100,
    trendImpact: Math.round(sanitizeNumber(entry.trendImpact, 0) * 100) / 100,
    multiplier: Number.isFinite(multiplier) ? multiplier : 1,
    delta: sanitizeOptionalNumber(entry.delta),
    score: sanitizeScore(entry.score)
  };
}

function sanitizeHistoryEntry(entry, fallbackDay) {
  if (!entry || typeof entry !== 'object') return null;
  const id = typeof entry.id === 'string' && entry.id ? entry.id : null;
  const day = sanitizeNumber(entry.day, fallbackDay);
  const recordedAt = sanitizeOptionalNumber(entry.recordedAt);
  const analytics = Array.isArray(entry.analytics)
    ? entry.analytics.map(sanitizeAnalyticsEntry).filter(Boolean)
    : [];
  const highlights = entry.highlights || {};

  return {
    id: id || `niche-history:${day}:${analytics.length}`,
    day,
    recordedAt,
    analytics,
    highlights: {
      hot: sanitizeHighlightEntry(highlights.hot),
      swing: sanitizeHighlightEntry(highlights.swing),
      risk: sanitizeHighlightEntry(highlights.risk)
    }
  };
}

let cachedNicheIds = null;

function getNicheIdSet() {
  if (!cachedNicheIds) {
    cachedNicheIds = new Set(nicheDefinitions.map(entry => entry.id));
  }
  return cachedNicheIds;
}

export function isValidNicheId(id) {
  if (typeof id !== 'string' || !id) return false;
  return getNicheIdSet().has(id);
}

function rollInitialNicheScore() {
  const min = 25;
  const max = 95;
  const spread = max - min;
  return Math.max(0, Math.min(100, Math.round(min + Math.random() * spread)));
}

export function ensureNicheStateShape(target, { fallbackDay = 1 } = {}) {
  if (!target) return;

  target.niches = target.niches || {};
  const nicheState = target.niches;
  nicheState.popularity = nicheState.popularity || {};

  const validIds = getNicheIdSet();
  for (const id of Object.keys(nicheState.popularity)) {
    if (!validIds.has(id)) {
      delete nicheState.popularity[id];
    }
  }

  for (const definition of nicheDefinitions) {
    const entry = nicheState.popularity[definition.id] || {};
    const score = Number(entry.score);
    const previousScore = Number(entry.previousScore);
    nicheState.popularity[definition.id] = {
      score: Number.isFinite(score)
        ? Math.max(0, Math.min(100, Math.round(score)))
        : rollInitialNicheScore(),
      previousScore: Number.isFinite(previousScore)
        ? Math.max(0, Math.min(100, Math.round(previousScore)))
        : null
    };
  }

  const storedDay = Number(nicheState.lastRollDay);
  nicheState.lastRollDay = Number.isFinite(storedDay) ? storedDay : fallbackDay;

  if (!Array.isArray(nicheState.analyticsHistory)) {
    nicheState.analyticsHistory = [];
  } else {
    nicheState.analyticsHistory = nicheState.analyticsHistory
      .map(entry => sanitizeHistoryEntry(entry, fallbackDay))
      .filter(Boolean);
  }

  if (nicheState.analyticsHistory.length > NICHE_ANALYTICS_HISTORY_LIMIT) {
    nicheState.analyticsHistory = nicheState.analyticsHistory.slice(
      -NICHE_ANALYTICS_HISTORY_LIMIT
    );
  }
}

