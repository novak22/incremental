import { formatHours, formatMoney } from '../../core/helpers.js';
import { clampNumber, clampScore, formatPercent, describeDelta } from './formatters.js';
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
import { getNicheRoster, getNicheWatchlist } from '../../game/assets/niches.js';

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

function buildNicheHighlights(analytics = []) {
  const defaults = {
    hot: { title: 'No readings yet', note: 'Assign a niche to start tracking buzz.' },
    swing: { title: 'Awaiting data', note: 'Fresh deltas will appear after the first reroll.' },
    risk: { title: 'All calm', note: 'We’ll flag niches that are cooling off fast.' }
  };

  if (!Array.isArray(analytics) || analytics.length === 0) {
    return defaults;
  }

  const invested = analytics.filter(entry => entry.assetCount > 0);
  const relevant = invested.length ? invested : analytics;
  const topImpact = relevant.slice().sort((a, b) => Math.abs(b.trendImpact) - Math.abs(a.trendImpact))[0];
  const fastestMove = analytics.slice().sort((a, b) => Math.abs(Number(b.popularity?.delta) || 0) - Math.abs(Number(a.popularity?.delta) || 0))[0];
  const negativePool = (invested.length ? invested : analytics).filter(entry => entry.trendImpact < 0);
  const biggestLoss = negativePool.sort((a, b) => a.trendImpact - b.trendImpact)[0];

  const highlights = { ...defaults };

  if (topImpact) {
    const impactValue = Math.abs(topImpact.trendImpact);
    const isPositive = topImpact.trendImpact >= 0;
    const impactLabel = impactValue >= 0.5
      ? `${isPositive ? '+' : '-'}$${formatMoney(impactValue)} trend ${isPositive ? 'boost' : 'drag'}`
      : `${formatPercent((Number(topImpact.popularity?.multiplier) || 1) - 1)} payouts`;
    highlights.hot = {
      title: `${topImpact.definition?.name || 'Untitled niche'} • ${impactLabel}`,
      note: topImpact.assetCount > 0
        ? `Your ${topImpact.assetCount} venture${topImpact.assetCount === 1 ? '' : 's'} made $${formatMoney(Math.max(0, topImpact.netEarnings))} today with ${formatPercent((Number(topImpact.popularity?.multiplier) || 1) - 1)} payouts.`
        : `Queue a venture to capture ${formatPercent((Number(topImpact.popularity?.multiplier) || 1) - 1)} payouts from this niche.`
    };
  }

  if (fastestMove && Number.isFinite(Number(fastestMove.popularity?.delta))) {
    const deltaText = describeDelta(fastestMove.popularity);
    const score = clampScore(fastestMove.popularity?.score);
    const payoutText = formatPercent((Number(fastestMove.popularity?.multiplier) || 1) - 1);
    const scoreText = score !== null ? `score ${score}` : 'score pending';
    highlights.swing = {
      title: `${fastestMove.definition?.name || 'Untitled niche'} • ${deltaText}`,
      note: `${payoutText} payouts • ${scoreText}.`
    };
  }

  if (biggestLoss) {
    const lossValue = Math.abs(biggestLoss.trendImpact);
    highlights.risk = {
      title: `${biggestLoss.definition?.name || 'Untitled niche'} • -$${formatMoney(lossValue)} trend drag`,
      note: biggestLoss.assetCount > 0
        ? `${biggestLoss.assetCount} venture${biggestLoss.assetCount === 1 ? '' : 's'} lost ${formatPercent((Number(biggestLoss.popularity?.multiplier) || 1) - 1)} vs baseline today.`
        : 'No ventures invested yet, so you are safe from this downswing.'
    };
  }

  return highlights;
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

export function buildNicheViewModel(state) {
  const analytics = buildNicheAnalytics(state);
  const watchlistCount = analytics.filter(entry => entry.watchlisted).length;
  return {
    highlights: buildNicheHighlights(analytics),
    board: buildNicheBoardModel(analytics),
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

export default {
  buildDashboardViewModel,
  buildDailySummaries,
  buildQuickActions,
  buildAssetUpgradeRecommendations,
  buildStudyEnrollmentActionModel
};
