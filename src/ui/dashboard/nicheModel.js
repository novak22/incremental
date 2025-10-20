import { formatMoney } from '../../core/helpers.js';
import { formatPercent, describeDelta } from './formatters.js';
import { collectNicheAnalytics, summarizeNicheHighlights } from '../../game/analytics/niches.js';

export function createHighlightDefaults() {
  return {
    hot: { title: 'No readings yet', note: 'Assign a niche to start tracking buzz.' },
    swing: { title: 'Awaiting data', note: 'Fresh deltas will appear once the first trend readings roll in.' },
    risk: { title: 'All calm', note: 'We’ll flag niches that are cooling off fast.' }
  };
}

export function composeHighlightMessages(summary = {}) {
  const defaults = createHighlightDefaults();
  const highlights = {
    hot: { ...defaults.hot },
    swing: { ...defaults.swing },
    risk: { ...defaults.risk }
  };

  const { hot, swing, risk } = summary || {};

  if (hot && hot.name) {
    const impactValue = Math.abs(Number(hot.trendImpact) || 0);
    const isPositive = Number(hot.trendImpact) >= 0;
    const multiplier = Number(hot.multiplier) || 1;
    const impactLabel = impactValue >= 0.5
      ? `${isPositive ? '+' : '-'}$${formatMoney(impactValue)} trend ${isPositive ? 'boost' : 'drag'}`
      : `${formatPercent(multiplier - 1)} payouts`;
    const ventureCount = Number(hot.assetCount) || 0;
    const earningsValue = Math.max(0, Number(hot.netEarnings) || 0);
    highlights.hot = {
      title: `${hot.name} • ${impactLabel}`,
      note: ventureCount > 0
        ? `Your ${ventureCount} venture${ventureCount === 1 ? '' : 's'} made $${formatMoney(earningsValue)} today with ${formatPercent(multiplier - 1)} payouts.`
        : `Queue a venture to capture ${formatPercent(multiplier - 1)} payouts from this niche.`
    };
  }

  if (swing && swing.name) {
    const delta = Number.isFinite(Number(swing.delta)) ? Number(swing.delta) : null;
    const deltaText = delta !== null ? describeDelta({ delta }) : 'Fresh reading';
    const multiplier = Number(swing.multiplier) || 1;
    const payoutText = formatPercent(multiplier - 1);
    const score = Number.isFinite(Number(swing.score)) ? Math.round(Number(swing.score)) : null;
    const scoreText = score !== null ? `score ${score}` : 'score pending';
    highlights.swing = {
      title: `${swing.name} • ${deltaText}`,
      note: `${payoutText} payouts • ${scoreText}.`
    };
  }

  if (risk && risk.name) {
    const lossValue = Math.abs(Number(risk.trendImpact) || 0);
    const ventureCount = Number(risk.assetCount) || 0;
    const multiplier = Number(risk.multiplier) || 1;
    const payoutText = formatPercent(multiplier - 1);
    highlights.risk = {
      title: `${risk.name} • -$${formatMoney(lossValue)} trend drag`,
      note: ventureCount > 0
        ? `${ventureCount} venture${ventureCount === 1 ? '' : 's'} lost ${payoutText} vs baseline today.`
        : 'No ventures invested yet, so you are safe from this downswing.'
    };
  }

  return highlights;
}

export function buildNicheHighlights(analytics = []) {
  if (!Array.isArray(analytics) || analytics.length === 0) {
    return createHighlightDefaults();
  }

  const summary = summarizeNicheHighlights(analytics);
  return composeHighlightMessages(summary);
}

export function buildNicheBoardModel(analytics = []) {
  const emptyMessages = {
    default: 'Assign a niche to a venture to start tracking demand swings.',
    investedOnly: 'You haven’t assigned any assets that fit this filter yet.',
    watchlistOnly: 'No watchlisted niches match the current filters.'
  };

  return {
    entries: analytics,
    emptyMessages
  };
}

export function formatHistoryTimestamp(timestamp) {
  const value = Number(timestamp);
  if (!Number.isFinite(value)) {
    return { label: '', iso: '' };
  }
  const date = new Date(value);
  return {
    label: date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    iso: date.toISOString()
  };
}

export function buildNicheHistoryModel(state = {}) {
  const history = Array.isArray(state?.niches?.analyticsHistory)
    ? state.niches.analyticsHistory
    : [];

  if (!history.length) {
    return {
      entries: [],
      emptyMessage: 'Complete a day with niches assigned to start logging history.'
    };
  }

  const entries = history
    .slice()
    .reverse()
    .map((entry, index) => {
      const analytics = Array.isArray(entry?.analytics) ? entry.analytics : [];
      const snapshot = entry?.highlights &&
        (entry.highlights.hot || entry.highlights.swing || entry.highlights.risk)
        ? entry.highlights
        : summarizeNicheHighlights(analytics);
      const highlights = composeHighlightMessages(snapshot);
      const { label, iso } = formatHistoryTimestamp(entry?.recordedAt);
      const dayNumber = Number(entry?.day);
      return {
        id: entry?.id || `niche-history:${index}`,
        dayLabel: Number.isFinite(dayNumber) ? `Day ${dayNumber}` : 'Day –',
        recordedAtLabel: label,
        recordedAtISO: iso,
        highlights
      };
    });

  return {
    entries,
    emptyMessage: 'Complete a day with niches assigned to start logging history.'
  };
}

export function buildNicheViewModel(state) {
  const analytics = collectNicheAnalytics(state);
  const watchlistCount = analytics.filter(entry => entry.watchlisted).length;
  return {
    highlights: buildNicheHighlights(analytics),
    board: buildNicheBoardModel(analytics),
    history: buildNicheHistoryModel(state),
    watchlistCount
  };
}

