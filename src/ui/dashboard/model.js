import { formatHours, formatMoney } from '../../core/helpers.js';
import { getAssetState } from '../../core/state.js';
import { registry } from '../../game/registry.js';
import {
  canPerformQualityAction,
  getNextQualityLevel,
  getQualityActions,
  getQualityTracks,
  performQualityAction
} from '../../game/assets/quality.js';
import { instanceLabel } from '../../game/assets/helpers.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../../game/requirements.js';
import { getNicheRoster, getNicheWatchlist } from '../../game/assets/niches.js';

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function computeTimeCap(state) {
  if (!state) return 0;
  return toNumber(state.baseTime) + toNumber(state.bonusTime) + toNumber(state.dailyBonusTime);
}

function buildIncomeSegments(activeEarnings, passiveEarnings) {
  const segments = [];
  if (activeEarnings > 0) {
    segments.push(`$${formatMoney(activeEarnings)} active`);
  }
  if (passiveEarnings > 0) {
    segments.push(`$${formatMoney(passiveEarnings)} passive`);
  }
  return segments;
}

function buildSpendSegments({ upkeepSpend, investmentSpend, net }) {
  const segments = [];
  if (upkeepSpend > 0) {
    segments.push(`$${formatMoney(upkeepSpend)} upkeep`);
  }
  if (investmentSpend > 0) {
    segments.push(`$${formatMoney(investmentSpend)} invest`);
  }
  if (net !== 0) {
    const label = `${net >= 0 ? 'Net +' : 'Net -'}$${formatMoney(Math.abs(net))}`;
    segments.push(label);
  }
  return segments;
}

function buildReservedSegments({ setupHours, maintenanceHours, flexHours }) {
  const segments = [];
  if (setupHours > 0) {
    segments.push(`${formatHours(setupHours)} setup`);
  }
  if (maintenanceHours > 0) {
    segments.push(`${formatHours(maintenanceHours)} upkeep`);
  }
  if (flexHours > 0) {
    segments.push(`${formatHours(flexHours)} hustle`);
  }
  return segments;
}

function describeQueue(summary = {}) {
  const entries = Array.isArray(summary.timeBreakdown) ? summary.timeBreakdown : [];
  if (!entries.length) {
    return [
      {
        id: 'queue-empty',
        label: 'Nothing queued yet',
        detail: 'Open hustles to schedule your next move.',
        hours: 0,
        state: 'idle'
      }
    ];
  }

  return entries.slice(0, 6).map(entry => ({
    id: entry.key,
    label: entry.label,
    detail: entry.value,
    hours: toNumber(entry.hours),
    state: entry.category === 'maintenance' ? 'maintenance' : 'active'
  }));
}

export function buildQuickActions(state) {
  if (!state) return [];
  const items = [];
  for (const hustle of registry.hustles) {
    if (hustle?.tag?.type === 'study') continue;
    if (!hustle?.action?.onClick) continue;
    const disabled = typeof hustle.action.disabled === 'function'
      ? hustle.action.disabled(state)
      : Boolean(hustle.action.disabled);
    if (disabled) continue;
    const payout = toNumber(hustle.payout?.amount);
    const time = toNumber(hustle.time || hustle.action?.timeCost) || 1;
    const roi = time > 0 ? payout / time : payout;
    items.push({
      id: hustle.id,
      label: hustle.name,
      primaryLabel: typeof hustle.action.label === 'function'
        ? hustle.action.label(state)
        : hustle.action.label || 'Queue',
      description: `${formatMoney(payout)} payout • ${formatHours(time)}`,
      onClick: hustle.action.onClick,
      roi,
      timeCost: time
    });
  }

  items.sort((a, b) => b.roi - a.roi);
  return items.slice(0, 4);
}

export function buildAssetUpgradeRecommendations(state) {
  if (!state) return [];

  const suggestions = [];

  for (const asset of registry.assets) {
    const qualityActions = getQualityActions(asset);
    if (!qualityActions.length) continue;

    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    if (!instances.length) continue;

    const tracks = getQualityTracks(asset);

    instances.forEach(instance => {
      if (instance?.status !== 'active') return;

      const quality = instance.quality || {};
      const level = Math.max(0, toNumber(quality.level));
      const nextLevel = getNextQualityLevel(asset, level);
      if (!nextLevel?.requirements) return;

      const progress = quality.progress || {};
      const requirements = Object.entries(nextLevel.requirements);
      if (!requirements.length) return;

      const assetIndex = assetState.instances.indexOf(instance);
      const label = instanceLabel(asset, assetIndex >= 0 ? assetIndex : 0);
      const performance = Math.max(0, toNumber(instance.lastIncome));

      requirements.forEach(([key, targetValue]) => {
        const target = Math.max(0, toNumber(targetValue));
        if (target <= 0) return;
        const current = Math.max(0, toNumber(progress?.[key]));
        const remaining = Math.max(0, target - current);
        if (remaining <= 0) return;

        const action = qualityActions.find(entry => entry.progressKey === key);
        if (!action) return;
        if (!canPerformQualityAction(asset, instance, action, state)) return;

        const completion = target > 0 ? Math.min(1, current / target) : 1;
        const percentComplete = Math.max(0, Math.min(100, Math.round(completion * 100)));
        const percentRemaining = Math.max(0, 100 - percentComplete);
        const track = tracks?.[key] || {};
        const requirementLabel = track.shortLabel || track.label || key;
        const timeCost = Math.max(0, toNumber(action.time));
        const moneyCost = Math.max(0, toNumber(action.cost));
        const effortParts = [];
        if (timeCost > 0) {
          effortParts.push(`${formatHours(timeCost)} focus`);
        }
        if (moneyCost > 0) {
          effortParts.push(`$${formatMoney(moneyCost)}`);
        }
        const progressNote = `${Math.min(current, target)}/${target} logged (${percentComplete}% complete)`;
        const meta = effortParts.length ? `${progressNote} • ${effortParts.join(' • ')}` : progressNote;
        const actionLabel = typeof action.label === 'function'
          ? action.label({ definition: asset, instance, state })
          : action.label;
        const buttonLabel = actionLabel || 'Boost Quality';

        suggestions.push({
          id: `asset-upgrade:${asset.id}:${instance.id}:${action.id}:${key}`,
          title: `${label} · ${buttonLabel}`,
          subtitle: `${remaining} ${requirementLabel} to go for Quality ${nextLevel.level} (${percentRemaining}% to go).`,
          meta,
          metaClass: 'upgrade-actions__meta',
          buttonLabel,
          onClick: () => performQualityAction(asset.id, instance.id, action.id),
          performance,
          completion,
          remaining,
          level,
          timeCost
        });
      });
    });
  }

  suggestions.sort((a, b) => {
    if (a.performance !== b.performance) {
      return a.performance - b.performance;
    }
    if (a.level !== b.level) {
      return a.level - b.level;
    }
    if (a.completion !== b.completion) {
      return a.completion - b.completion;
    }
    if (a.remaining !== b.remaining) {
      return b.remaining - a.remaining;
    }
    return a.title.localeCompare(b.title);
  });

  return suggestions;
}

function computeAssetMetrics(state) {
  let activeAssets = 0;
  let upkeepDue = 0;

  for (const asset of registry.assets) {
    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach(instance => {
      if (instance?.status !== 'active') return;
      activeAssets += 1;
      if (!instance.maintenanceFundedToday) {
        upkeepDue += toNumber(asset.maintenance?.cost);
      }
    });
  }

  return { activeAssets, upkeepDue };
}

function computeStudyProgress(state) {
  const tracks = Object.values(KNOWLEDGE_TRACKS);
  if (!tracks.length) {
    return { percent: 0, summary: 'No study tracks unlocked yet.' };
  }
  let enrolled = 0;
  let completed = 0;
  let totalProgress = 0;
  tracks.forEach(track => {
    const progress = getKnowledgeProgress(track.id, state);
    if (!progress.enrolled) return;
    enrolled += 1;
    if (progress.completed) {
      completed += 1;
      totalProgress += 1;
    } else {
      const fraction = Math.min(1, toNumber(progress.daysCompleted) / Math.max(1, track.days));
      totalProgress += fraction;
    }
  });
  const percent = enrolled > 0 ? Math.round((totalProgress / enrolled) * 100) : 0;
  const summary = enrolled
    ? `${completed}/${enrolled} finished • ${percent}% average progress`
    : 'No active study tracks.';
  return { percent, summary };
}

function buildNotifications(state) {
  if (!state) return [];
  const notifications = [];

  for (const asset of registry.assets) {
    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    const maintenanceDue = instances.filter(instance => instance?.status === 'active' && !instance.maintenanceFundedToday);
    if (maintenanceDue.length) {
      notifications.push({
        id: `${asset.id}:maintenance`,
        label: `${asset.name} needs upkeep`,
        message: `${maintenanceDue.length} build${maintenanceDue.length === 1 ? '' : 's'} waiting for maintenance`,
        targetPanel: 'panel-ventures'
      });
    }
  }

  const affordableUpgrades = registry.upgrades.filter(upgrade => {
    const cost = toNumber(upgrade.cost);
    if (cost <= 0) return false;
    const owned = state?.upgrades?.[upgrade.id]?.purchased;
    if (owned && !upgrade.repeatable) return false;
    return toNumber(state?.money) >= cost;
  });

  affordableUpgrades.slice(0, 3).forEach(upgrade => {
    notifications.push({
      id: `${upgrade.id}:upgrade`,
      label: `${upgrade.name} is affordable`,
      message: `$${formatMoney(upgrade.cost)} ready to invest`,
      targetPanel: 'panel-upgrades'
    });
  });

  return notifications;
}

function normalizeLogEntries(state) {
  const log = Array.isArray(state?.log) ? [...state.log] : [];
  return log
    .filter(entry => entry)
    .sort((a, b) => toNumber(b.timestamp) - toNumber(a.timestamp))
    .slice(0, 4)
    .map(entry => ({
      id: entry.id || String(entry.timestamp),
      timestamp: toNumber(entry.timestamp),
      message: entry.message || ''
    }));
}

function buildDailyStats(summary = {}) {
  const totalTime = Math.max(0, toNumber(summary.totalTime));
  const setupHours = Math.max(0, toNumber(summary.setupHours));
  const maintenanceHours = Math.max(0, toNumber(summary.maintenanceHours));
  const otherTimeHours = Math.max(0, toNumber(summary.otherTimeHours));
  const timeSummary = totalTime > 0
    ? `${formatHours(totalTime)} invested • ${formatHours(setupHours)} setup • ${formatHours(maintenanceHours)} upkeep • ${formatHours(otherTimeHours)} flex`
    : 'No hours logged yet. Queue a hustle to get moving.';

  const totalEarnings = Math.max(0, toNumber(summary.totalEarnings));
  const activeEarnings = Math.max(0, toNumber(summary.activeEarnings));
  const passiveEarnings = Math.max(0, toNumber(summary.passiveEarnings));
  const earningsSummary = totalEarnings > 0
    ? `$${formatMoney(totalEarnings)} earned • $${formatMoney(activeEarnings)} active • $${formatMoney(passiveEarnings)} passive`
    : 'Payouts will appear once you start closing deals.';

  const totalSpend = Math.max(0, toNumber(summary.totalSpend));
  const upkeepSpend = Math.max(0, toNumber(summary.upkeepSpend));
  const investmentSpend = Math.max(0, toNumber(summary.investmentSpend));
  const spendSummary = totalSpend > 0
    ? `$${formatMoney(totalSpend)} spent • $${formatMoney(upkeepSpend)} upkeep • $${formatMoney(investmentSpend)} investments`
    : 'Outflows land here when upkeep and investments fire.';

  const knowledgeInProgress = Math.max(0, toNumber(summary.knowledgeInProgress));
  const knowledgePending = Math.max(0, toNumber(summary.knowledgePendingToday));
  const studySummary = knowledgeInProgress > 0
    ? `${knowledgeInProgress} track${knowledgeInProgress === 1 ? '' : 's'} in flight • ${knowledgePending > 0 ? `${knowledgePending} session${knowledgePending === 1 ? '' : 's'} waiting today` : 'All sessions logged today'}`
    : 'Enroll in a track to kickstart your learning streak.';

  const normalizeList = list => (Array.isArray(list) ? list.filter(Boolean) : []);

  return {
    time: {
      summary: timeSummary,
      entries: normalizeList(summary.timeBreakdown),
      emptyMessage: 'Time tracking kicks off after your first action.',
      limit: 3
    },
    earnings: {
      summary: earningsSummary,
      active: {
        entries: normalizeList(summary.earningsBreakdown),
        emptyMessage: 'Active gigs will report here.',
        limit: 3
      },
      passive: {
        entries: normalizeList(summary.passiveBreakdown),
        emptyMessage: 'Passive and offline streams update after upkeep.',
        limit: 3
      }
    },
    spend: {
      summary: spendSummary,
      entries: normalizeList(summary.spendBreakdown),
      emptyMessage: 'No cash out yet. Fund upkeep or buy an upgrade.',
      limit: 3
    },
    study: {
      summary: studySummary,
      entries: normalizeList(summary.studyBreakdown),
      emptyMessage: 'Your courses will list here once enrolled.',
      limit: 3
    }
  };
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
      status: describeTrendStatus(entry),
      score: clampScore(entry.popularity?.score),
      deltaLabel: describeDelta(entry.popularity),
      multiplierLabel: Number.isFinite(entry.popularity?.multiplier)
        ? (entry.popularity.multiplier === 1
          ? 'Baseline payouts'
          : `${formatPercent(entry.popularity.multiplier - 1)} payouts`)
        : 'Payout data pending'
    };
  });
}

function buildHeaderMetrics(state, summary = {}) {
  const hoursLeft = Math.max(0, toNumber(state?.timeLeft));
  const dailyEarnings = Math.max(0, toNumber(summary.totalEarnings));
  const activeEarnings = Math.max(0, toNumber(summary.activeEarnings));
  const passiveEarnings = Math.max(0, toNumber(summary.passiveEarnings));
  const dailySpend = Math.max(0, toNumber(summary.totalSpend));
  const upkeepSpend = Math.max(0, toNumber(summary.upkeepSpend));
  const investmentSpend = Math.max(0, toNumber(summary.investmentSpend));
  const timeCap = Math.max(hoursLeft, computeTimeCap(state));
  const reservedHours = Math.max(0, timeCap - hoursLeft);
  const setupHours = Math.max(0, toNumber(summary.setupHours));
  const maintenanceHours = Math.max(0, toNumber(summary.maintenanceHours));
  const flexHours = Math.max(0, reservedHours - setupHours - maintenanceHours);
  const incomeSegments = buildIncomeSegments(activeEarnings, passiveEarnings);
  const net = dailyEarnings - dailySpend;
  const spendSegments = buildSpendSegments({ upkeepSpend, investmentSpend, net });
  const reservedSegments = buildReservedSegments({ setupHours, maintenanceHours, flexHours });

  return {
    session: {
      day: state?.day ?? 0,
      hoursRemaining: hoursLeft,
      timeCap,
      statusText: `Day ${state?.day ?? 0} • ${formatHours(hoursLeft)} remaining`,
      moneyText: `$${formatMoney(state?.money || 0)}`
    },
    metrics: {
      dailyPlus: {
        value: `$${formatMoney(dailyEarnings)}`,
        note: incomeSegments.length ? incomeSegments.join(' • ') : 'Waiting on payouts'
      },
      dailyMinus: {
        value: `$${formatMoney(dailySpend)}`,
        note: spendSegments.length ? spendSegments.join(' • ') : 'No cash out yet'
      },
      timeAvailable: {
        value: formatHours(hoursLeft),
        note: `Cap ${formatHours(timeCap)}`
      },
      timeReserved: {
        value: formatHours(reservedHours),
        note: reservedSegments.length ? reservedSegments.join(' • ') : 'Queue is wide open'
      }
    }
  };
}

function buildKpiStats(state, summary = {}) {
  const hoursLeft = Math.max(0, toNumber(state?.timeLeft));
  const net = toNumber(summary.totalEarnings) - toNumber(summary.totalSpend);
  const { activeAssets, upkeepDue } = computeAssetMetrics(state);
  const { percent, summary: studySummary } = computeStudyProgress(state);

  return {
    net: {
      value: `$${formatMoney(net)}`,
      note: `${formatMoney(summary.totalEarnings || 0)} earned • ${formatMoney(summary.totalSpend || 0)} spent`
    },
    hours: {
      value: formatHours(hoursLeft),
      note: hoursLeft > 0 ? 'Plenty of hustle hours left.' : 'Day is tapped out.'
    },
    upkeep: {
      value: `$${formatMoney(upkeepDue)}`,
      note: upkeepDue > 0 ? 'Maintain ventures soon.' : 'Upkeep funded.'
    },
    ventures: {
      value: String(activeAssets),
      note: activeAssets > 0 ? 'Streams humming.' : 'Launch your first venture.'
    },
    study: {
      value: `${percent}%`,
      note: studySummary
    }
  };
}

export function buildDashboardModel(state, summary = {}) {
  if (!state) return null;

  const header = buildHeaderMetrics(state, summary);
  const kpis = buildKpiStats(state, summary);
  const queue = describeQueue(summary);
  const quickActions = buildQuickActions(state);
  const assetUpgrades = buildAssetUpgradeRecommendations(state);
  const notifications = buildNotifications(state);
  const eventLog = normalizeLogEntries(state);
  const dailyStats = buildDailyStats(summary);
  const niches = buildNicheAnalytics(state);

  return {
    session: header.session,
    headerMetrics: header.metrics,
    kpis,
    queue,
    quickActions,
    assetUpgrades,
    notifications,
    eventLog,
    dailyStats,
    niches
  };
}

export { buildDailyStats, describeQueue as buildQueueEntries, buildNotifications, buildNicheAnalytics };
