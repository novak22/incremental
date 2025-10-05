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
import { getAssetState } from '../../core/state.js';
import { getAssets, getUpgrades } from '../../game/registryService.js';
import { collectNicheAnalytics, summarizeNicheHighlights } from '../../game/analytics/niches.js';
import { collectActionProviders } from '../actions/registry.js';

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

function buildNotifications(state = {}) {
  const notifications = [];

  for (const asset of getAssets()) {
    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    const maintenanceDue = instances.filter(instance => instance?.status === 'active' && !instance.maintenanceFundedToday);
    if (maintenanceDue.length) {
      notifications.push({
        id: `${asset.id}:maintenance`,
        label: `${asset.name} needs upkeep`,
        message: `${maintenanceDue.length} build${maintenanceDue.length === 1 ? '' : 's'} waiting for maintenance`,
        action: { type: 'shell-tab', tabId: 'tab-ventures' }
      });
    }
  }

  const affordableUpgrades = getUpgrades().filter(upgrade => {
    const cost = clampNumber(upgrade.cost);
    if (cost <= 0) return false;
    const owned = state?.upgrades?.[upgrade.id]?.purchased;
    if (owned && !upgrade.repeatable) return false;
    return clampNumber(state?.money) >= cost;
  });

  affordableUpgrades.slice(0, 3).forEach(upgrade => {
    notifications.push({
      id: `${upgrade.id}:upgrade`,
      label: `${upgrade.name} is affordable`,
      message: `$${formatMoney(upgrade.cost)} ready to invest`,
      action: { type: 'shell-tab', tabId: 'tab-upgrades' }
    });
  });

  return notifications;
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
  const entries = buildNotifications(state);
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
  const providerSnapshots = collectActionProviders({ state, summary }) || [];

  function selectProvider(id, focusCategory) {
    return providerSnapshots.find(snapshot => snapshot.id === id)
      || providerSnapshots.find(snapshot => snapshot.focusCategory === focusCategory)
      || null;
  }

  function buildQuickActionsFromProvider(provider) {
    if (!provider) {
      return buildQuickActionModel(state);
    }

    const metrics = provider.metrics || {};
    const entries = (provider.entries || []).map(entry => {
      const source = entry.raw || {};
      const title = source.title || entry.title;
      const subtitle = source.subtitle || source.description || '';
      const buttonLabel = source.buttonLabel || source.primaryLabel || metrics.defaultLabel || 'Queue';
      const durationHours = Number.isFinite(entry.timeCost)
        ? entry.timeCost
        : Number.isFinite(source.timeCost)
          ? source.timeCost
          : entry.durationHours;
      const payout = Number.isFinite(source.payout)
        ? source.payout
        : entry.payout;
      const payoutText = source.payoutText || entry.payoutText || entry.meta || '';
      const meta = source.meta || entry.meta || payoutText;
      return {
        id: entry.id,
        title,
        subtitle,
        buttonLabel,
        onClick: entry.onClick,
        payout,
        payoutText,
        durationHours,
        durationText: source.durationText || entry.durationText,
        meta,
        repeatable: source.repeatable ?? entry.repeatable,
        remainingRuns: source.remainingRuns ?? entry.remainingRuns
      };
    });

    const baseHours = clampNumber(state.baseTime)
      + clampNumber(state.bonusTime)
      + clampNumber(state.dailyBonusTime);
    const hoursAvailable = metrics.hoursAvailable != null
      ? Math.max(0, clampNumber(metrics.hoursAvailable))
      : Math.max(0, clampNumber(state.timeLeft));
    const hoursSpent = metrics.hoursSpent != null
      ? Math.max(0, clampNumber(metrics.hoursSpent))
      : Math.max(0, baseHours - hoursAvailable);

    const scroller = metrics.scroller;
    const model = {
      entries,
      emptyMessage: metrics.emptyMessage || 'No ready actions. Check upgrades or ventures.',
      buttonClass: metrics.buttonClass || 'primary',
      defaultLabel: metrics.defaultLabel || 'Queue',
      hoursAvailable,
      hoursAvailableLabel: metrics.hoursAvailableLabel || formatHours(hoursAvailable),
      hoursSpent,
      hoursSpentLabel: metrics.hoursSpentLabel || formatHours(hoursSpent),
      day: clampNumber(state.day),
      moneyAvailable: metrics.moneyAvailable != null
        ? clampNumber(metrics.moneyAvailable)
        : clampNumber(state.money)
    };

    if (scroller) {
      model.scroller = scroller;
    }

    return model;
  }

  function buildAssetActionsFromProvider(provider) {
    if (!provider) {
      return buildAssetActionModel(state);
    }

    const metrics = provider.metrics || {};
    const entries = (provider.entries || []).map(entry => {
      const source = entry.raw || {};
      const title = source.title || entry.title;
      const subtitle = source.subtitle || source.description || '';
      const meta = source.meta || entry.meta || '';
      const metaClass = source.metaClass || '';
      const timeCost = Number.isFinite(source.timeCost)
        ? source.timeCost
        : Number.isFinite(entry.timeCost)
          ? entry.timeCost
          : entry.durationHours;
      const moneyCost = Number.isFinite(source.moneyCost)
        ? source.moneyCost
        : entry.moneyCost;
      return {
        id: entry.id,
        title,
        subtitle,
        meta,
        metaClass,
        buttonLabel: source.buttonLabel || metrics.defaultLabel || 'Boost',
        onClick: entry.onClick,
        timeCost: Number.isFinite(timeCost) ? timeCost : 0,
        durationHours: Number.isFinite(timeCost) ? timeCost : 0,
        durationText: source.durationText || entry.durationText,
        moneyCost,
        repeatable: source.repeatable ?? entry.repeatable,
        remainingRuns: source.remainingRuns ?? entry.remainingRuns
      };
    });

    return {
      entries,
      emptyMessage: metrics.emptyMessage
        || 'Every venture is humming along. Check back after today’s upkeep.',
      buttonClass: metrics.buttonClass || 'secondary',
      defaultLabel: metrics.defaultLabel || 'Boost',
      scroller: metrics.scroller || { limit: 6 },
      moneyAvailable: metrics.moneyAvailable != null
        ? clampNumber(metrics.moneyAvailable)
        : clampNumber(state.money)
    };
  }

  function buildStudyActionsFromProvider(provider) {
    if (!provider) {
      return buildStudyEnrollmentActionModel(state);
    }

    const metrics = provider.metrics || {};
    const entries = (provider.entries || []).map(entry => {
      const source = entry.raw || {};
      const title = source.title || entry.title;
      const subtitle = source.subtitle || source.description || '';
      const meta = source.meta || entry.meta || '';
      const timeCost = Number.isFinite(source.timeCost)
        ? source.timeCost
        : Number.isFinite(entry.timeCost)
          ? entry.timeCost
          : entry.durationHours;
      const moneyCost = Number.isFinite(source.moneyCost)
        ? source.moneyCost
        : entry.moneyCost;
      return {
        id: entry.id,
        title,
        subtitle,
        meta,
        buttonLabel: source.buttonLabel || metrics.defaultLabel || 'Enroll',
        onClick: entry.onClick,
        timeCost: Number.isFinite(timeCost) ? timeCost : 0,
        durationHours: Number.isFinite(timeCost) ? timeCost : 0,
        durationText: source.durationText || entry.durationText,
        moneyCost,
        repeatable: source.repeatable ?? entry.repeatable,
        remainingRuns: source.remainingRuns ?? entry.remainingRuns
      };
    });

    const baseHours = clampNumber(state.baseTime)
      + clampNumber(state.bonusTime)
      + clampNumber(state.dailyBonusTime);
    const hoursAvailable = metrics.hoursAvailable != null
      ? Math.max(0, clampNumber(metrics.hoursAvailable))
      : Math.max(0, clampNumber(state.timeLeft));
    const hoursSpent = metrics.hoursSpent != null
      ? Math.max(0, clampNumber(metrics.hoursSpent))
      : Math.max(0, baseHours - hoursAvailable);

    return {
      entries,
      emptyMessage: metrics.emptyMessage || 'No study tracks are ready to enroll right now.',
      moneyAvailable: metrics.moneyAvailable != null
        ? clampNumber(metrics.moneyAvailable)
        : clampNumber(state.money),
      hoursAvailable,
      hoursAvailableLabel: metrics.hoursAvailableLabel || formatHours(hoursAvailable),
      hoursSpent,
      hoursSpentLabel: metrics.hoursSpentLabel || formatHours(hoursSpent)
    };
  }

  const quickProvider = selectProvider('quick-actions', 'hustle');
  const assetProvider = selectProvider('asset-upgrades', 'upgrade');
  const studyProvider = selectProvider('study-enrollment', 'study');

  return {
    session,
    headerMetrics: daily.headerMetrics,
    kpis: daily.kpis,
    queue: daily.queue,
    quickActions: buildQuickActionsFromProvider(quickProvider),
    assetActions: buildAssetActionsFromProvider(assetProvider),
    studyActions: buildStudyActionsFromProvider(studyProvider),
    notifications: buildNotificationModel(state),
    eventLog: buildEventLogModel(state),
    dailyStats: daily.dailyStats,
    niche: buildNicheViewModel(state)
  };
}

export { buildQuickActionModel, buildAssetActionModel, buildStudyEnrollmentActionModel };

