import { formatHours, formatMoney } from '../../core/helpers.js';
import { clampNumber, formatPercent, describeDelta } from './formatters.js';
import { buildDailySummaries } from './passiveIncome.js';
import {
  buildQuickActionModel,
  buildAssetActionModel,
  buildQuickActions,
  buildAssetUpgradeRecommendations
} from './quickActions.js';
import { buildStudyEnrollmentActionModel } from './knowledge.js';
import notificationsService from '../notifications/service.js';
import { collectNicheAnalytics, summarizeNicheHighlights } from '../../game/analytics/niches.js';

function createHighlightDefaults() {
  return {
    hot: { title: 'No readings yet', note: 'Assign a niche to start tracking buzz.' },
    swing: { title: 'Awaiting data', note: 'Fresh deltas will appear after the first reroll.' },
    risk: { title: 'All calm', note: 'We’ll flag niches that are cooling off fast.' }
  };
}

function composeHighlightMessages(summary = {}) {
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

function buildNicheHighlights(analytics = []) {
  if (!Array.isArray(analytics) || analytics.length === 0) {
    return createHighlightDefaults();
  }

  const summary = summarizeNicheHighlights(analytics);
  return composeHighlightMessages(summary);
}

function buildNicheBoardModel(analytics = []) {
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

function formatHistoryTimestamp(timestamp) {
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

function buildNicheHistoryModel(state = {}) {
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

function formatEventLogEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const timestamp = Number(entry.timestamp);
  const date = Number.isFinite(timestamp) ? new Date(timestamp) : null;

  return {
    id: entry.id || (Number.isFinite(timestamp) ? `log:${timestamp}` : `log:${Date.now()}`),
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    message: String(entry.message ?? ''),
    type: typeof entry.type === 'string' && entry.type ? entry.type : 'info',
    read: entry.read === true,
    timeLabel: date
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''
  };
}

function buildEventLog(state = {}) {
  const log = Array.isArray(state.log) ? [...state.log] : [];
  if (!log.length) {
    return [];
  }

  return log
    .slice()
    .sort((a, b) => {
      const aTime = Number(a?.timestamp) || 0;
      const bTime = Number(b?.timestamp) || 0;
      return bTime - aTime;
    })
    .map(formatEventLogEntry)
    .filter(Boolean);
}

function buildNotificationModel(state = {}) {
  const entries = notificationsService.getSnapshot();
  return {
    entries,
    emptyMessage: 'All clear. Nothing urgent on deck.'
  };
}

export function buildEventLogModel(state = {}) {
  const allEntries = buildEventLog(state);
  return {
    entries: allEntries.slice(0, 4),
    allEntries,
    emptyMessage: 'Log is quiet. Run a hustle or buy an upgrade.'
  };
}

export function buildDashboardViewModel(state, summary = {}) {
  if (!state) return null;

  const hoursLeft = Math.max(0, clampNumber(state.timeLeft));
  const session = {
    statusText: `Day ${state.day || 0} • ${formatHours(hoursLeft)} remaining`,
    moneyText: `$${formatMoney(clampNumber(state.money))}`
  };

  const daily = buildDailySummaries(state, summary);

  return {
    session,
    headerMetrics: daily.headerMetrics,
    kpis: daily.kpis,
    queue: daily.queue,
    quickActions: buildQuickActionModel(state),
    assetActions: buildAssetActionModel(state),
    studyActions: buildStudyEnrollmentActionModel(state),
    notifications: buildNotificationModel(state),
    eventLog: buildEventLogModel(state),
    dailyStats: daily.dailyStats,
    niche: buildNicheViewModel(state)
  };
}

export { buildQuickActionModel, buildAssetActionModel, buildStudyEnrollmentActionModel };

export default {
  buildDashboardViewModel,
  buildDailySummaries,
  buildQuickActions,
  buildAssetUpgradeRecommendations,
  buildStudyEnrollmentActionModel
};
