import { formatHours, formatMoney } from '../../core/helpers.js';
import { getAssetState } from '../../core/state.js';
import { getAssets, getHustles, getUpgrades } from '../../game/registryService.js';
import { getNicheRoster, getNicheWatchlist } from '../../game/assets/niches.js';
import {
  canPerformQualityAction,
  getNextQualityLevel,
  getQualityActions,
  getQualityTracks,
  performQualityAction
} from '../../game/assets/quality.js';
import { instanceLabel } from '../../game/assets/helpers.js';
import { KNOWLEDGE_TRACKS, getKnowledgeProgress } from '../../game/requirements.js';

function clampNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampScore(value) {
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getMetricLabel(entry = {}) {
  return entry.label
    || entry?.definition?.label
    || entry?.definition?.name
    || entry.key
    || 'Metric';
}

function extractIconPrefix(label) {
  if (typeof label !== 'string') return '';
  const match = label.match(/^([^\w]*)/u);
  return match ? match[1].trim() : '';
}

function formatTimeEntries(summary = {}) {
  const entries = Array.isArray(summary.timeBreakdown) ? summary.timeBreakdown : [];
  return entries.map(entry => {
    const hours = clampNumber(entry?.hours);
    return {
      key: entry?.key,
      label: getMetricLabel(entry),
      value: `${formatHours(hours)} today`,
      hours,
      category: entry?.category || entry?.definition?.category || 'general',
      definition: entry?.definition
    };
  });
}

function formatPayoutEntries(entries = []) {
  return entries.map(entry => {
    const amount = clampNumber(entry?.amount);
    const baseLabel = getMetricLabel(entry);
    let label = baseLabel;

    if (entry?.source?.type === 'asset') {
      const prefix = extractIconPrefix(entry?.label);
      const name = entry?.source?.name || baseLabel;
      const decorated = entry?.source?.count > 1 ? `${name} (${entry.source.count})` : name;
      label = prefix ? `${prefix} ${decorated}`.trim() : decorated;
    }

    return {
      key: entry?.key,
      label,
      value: `$${formatMoney(amount)} today`,
      amount,
      category: entry?.category || entry?.definition?.category || 'general',
      definition: entry?.definition,
      stream: entry?.stream,
      source: entry?.source
    };
  });
}

function formatSpendEntries(entries = []) {
  return entries.map(entry => {
    const amount = clampNumber(entry?.amount);
    return {
      key: entry?.key,
      label: getMetricLabel(entry),
      value: `$${formatMoney(amount)} today`,
      amount,
      category: entry?.category || entry?.definition?.category || 'general',
      definition: entry?.definition
    };
  });
}

function formatStudyEntries(entries = []) {
  return entries.map(entry => {
    const hours = clampNumber(entry?.hoursPerDay);
    const remaining = Math.max(0, clampNumber(entry?.remainingDays));
    const status = entry?.status || (entry?.studiedToday ? 'scheduled' : 'waiting');
    return {
      trackId: entry?.trackId,
      label: `📘 ${entry?.name}`,
      value: `${formatHours(hours)} / day • ${remaining} day${remaining === 1 ? '' : 's'} left (${status})`,
      hoursPerDay: hours,
      remainingDays: remaining,
      studiedToday: Boolean(entry?.studiedToday),
      status
    };
  });
}

function buildSummaryPresentations(summary = {}) {
  return {
    timeEntries: formatTimeEntries(summary),
    earningsEntries: formatPayoutEntries(Array.isArray(summary.earningsBreakdown) ? summary.earningsBreakdown : []),
    passiveEntries: formatPayoutEntries(Array.isArray(summary.passiveBreakdown) ? summary.passiveBreakdown : []),
    spendEntries: formatSpendEntries(Array.isArray(summary.spendBreakdown) ? summary.spendBreakdown : []),
    studyEntries: formatStudyEntries(Array.isArray(summary.studyBreakdown) ? summary.studyBreakdown : [])
  };
}

function getQualitySnapshot(instance = {}) {
  const level = Math.max(0, clampNumber(instance?.quality?.level));
  const progress = instance?.quality?.progress && typeof instance.quality.progress === 'object'
    ? { ...instance.quality.progress }
    : {};
  return {
    level,
    progress
  };
}

function resolveProgressAmount(action, context) {
  if (!action) return 0;
  if (typeof action.progressAmount === 'function') {
    try {
      const amount = Number(action.progressAmount(context));
      if (Number.isFinite(amount) && amount > 0) {
        return amount;
      }
    } catch (error) {
      return 0;
    }
  }
  if (Number.isFinite(Number(action.progressAmount))) {
    const numeric = Number(action.progressAmount);
    return numeric > 0 ? numeric : 0;
  }
  if (action.progressKey) {
    return 1;
  }
  return 0;
}

function getProgressPerRun(asset, instance, action, state) {
  if (!asset || !instance || !action) return 0;
  const quality = getQualitySnapshot(instance);
  const context = {
    state,
    definition: asset,
    instance,
    quality,
    upgrade: id => state?.upgrades?.[id]
  };
  return resolveProgressAmount(action, context);
}

function estimateRemainingRuns(asset, instance, action, remaining, state) {
  if (!Number.isFinite(remaining) || remaining <= 0) {
    return 0;
  }
  const progressPerRun = getProgressPerRun(asset, instance, action, state);
  if (!Number.isFinite(progressPerRun) || progressPerRun <= 0) {
    return null;
  }
  return Math.max(1, Math.ceil(remaining / progressPerRun));
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

function computeTimeCap(state = {}) {
  const base = clampNumber(state.baseTime);
  const bonus = clampNumber(state.bonusTime);
  const daily = clampNumber(state.dailyBonusTime);
  return Math.max(0, base + bonus + daily);
}

function describeQueue(summary = {}) {
  const { timeEntries } = buildSummaryPresentations(summary);
  const entries = Array.isArray(timeEntries) ? timeEntries : [];
  if (!entries.length) {
    return [
      {
        id: 'queue:empty',
        label: 'Nothing queued yet',
        detail: 'Open hustles to schedule your next move.',
        hours: 0,
        state: 'idle'
      }
    ];
  }

  return entries.slice(0, 6).map(entry => ({
    id: entry.key || entry.label || 'queue:item',
    label: entry.label,
    detail: entry.value,
    hours: clampNumber(entry.hours),
    state: entry.category === 'maintenance' ? 'maintenance' : 'active'
  }));
}

export function buildQuickActions(state) {
  const items = [];
  for (const hustle of getHustles()) {
    if (hustle?.tag?.type === 'study') continue;
    if (!hustle?.action?.onClick) continue;
    const usage = typeof hustle.getDailyUsage === 'function' ? hustle.getDailyUsage(state) : null;
    const remainingRuns = Number.isFinite(usage?.remaining)
      ? Math.max(0, usage.remaining)
      : Infinity;
    const usageLimit = usage?.limit;
    const repeatable = remainingRuns > 0 && (!Number.isFinite(usageLimit) || usageLimit !== 1);
    const disabled = typeof hustle.action.disabled === 'function'
      ? hustle.action.disabled(state)
      : Boolean(hustle.action.disabled);
    if (disabled) continue;
    const payout = clampNumber(hustle.payout?.amount);
    const time = clampNumber(hustle.time || hustle.action?.timeCost) || 1;
    const roi = time > 0 ? payout / time : payout;
    const payoutText = `$${formatMoney(payout)}`;
    const timeText = formatHours(time);
    items.push({
      id: hustle.id,
      label: hustle.name,
      primaryLabel: typeof hustle.action.label === 'function'
        ? hustle.action.label(state)
        : hustle.action.label || 'Queue',
      description: `${formatMoney(payout)} payout • ${formatHours(time)}`,
      onClick: hustle.action.onClick,
      roi,
      timeCost: time,
      payout,
      payoutText,
      durationHours: time,
      durationText: timeText,
      meta: `${payoutText} • ${timeText}`,
      repeatable,
      remainingRuns
    });
  }

  items.sort((a, b) => b.roi - a.roi);
  return items;
}

export function buildAssetUpgradeRecommendations(state) {
  if (!state) return [];

  const suggestions = [];

  for (const asset of getAssets()) {
    const qualityActions = getQualityActions(asset);
    if (!qualityActions.length) continue;

    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    if (!instances.length) continue;

    const tracks = getQualityTracks(asset);

    instances.forEach(instance => {
      if (instance?.status !== 'active') return;

      const quality = instance.quality || {};
      const level = Math.max(0, clampNumber(quality.level));
      const nextLevel = getNextQualityLevel(asset, level);
      if (!nextLevel?.requirements) return;

      const progress = quality.progress || {};
      const requirements = Object.entries(nextLevel.requirements);
      if (!requirements.length) return;

      const assetIndex = assetState.instances.indexOf(instance);
      const label = instanceLabel(asset, assetIndex >= 0 ? assetIndex : 0);
      const performance = Math.max(0, clampNumber(instance.lastIncome));

      requirements.forEach(([key, targetValue]) => {
        const target = Math.max(0, clampNumber(targetValue));
        if (target <= 0) return;
        const current = Math.max(0, clampNumber(progress?.[key]));
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
        const timeCost = Math.max(0, clampNumber(action.time));
        const moneyCost = Math.max(0, clampNumber(action.cost));
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
        const remainingRuns = estimateRemainingRuns(asset, instance, action, remaining, state);
        const repeatable = remainingRuns == null ? true : remainingRuns > 1;

        suggestions.push({
          id: `asset-upgrade:${asset.id}:${instance.id}:${action.id}:${key}`,
          title: `${label} · ${buttonLabel}`,
          subtitle: `${remaining} ${requirementLabel} to go for Quality ${nextLevel.level} (${percentRemaining}% to go).`,
          meta,
          buttonLabel,
          onClick: () => performQualityAction(asset.id, instance.id, action.id),
          performance,
          completion,
          remaining,
          level,
          timeCost,
          remainingRuns,
          repeatable
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

function computeAssetMetrics(state = {}) {
  let activeAssets = 0;
  let upkeepDue = 0;

  for (const asset of getAssets()) {
    const assetState = getAssetState(asset.id, state);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    instances.forEach(instance => {
      if (instance?.status === 'active') {
        activeAssets += 1;
        if (!instance.maintenanceFundedToday) {
          upkeepDue += clampNumber(asset.maintenance?.cost);
        }
      }
    });
  }

  return { activeAssets, upkeepDue };
}

function computeStudyProgress(state = {}) {
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
      const fraction = Math.min(1, (progress.daysCompleted || 0) / Math.max(1, track.days));
      totalProgress += fraction;
    }
  });
  const percent = enrolled > 0 ? Math.round((totalProgress / Math.max(1, enrolled)) * 100) : 0;
  const summary = enrolled
    ? `${completed}/${enrolled} finished • ${percent}% average progress`
    : 'No active study tracks.';
  return { percent, summary };
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

function buildDailyStats(summary = {}) {
  const presentations = buildSummaryPresentations(summary);
  const totalTime = Math.max(0, clampNumber(summary.totalTime));
  const setupHours = Math.max(0, clampNumber(summary.setupHours));
  const maintenanceHours = Math.max(0, clampNumber(summary.maintenanceHours));
  const otherTimeHours = Math.max(0, clampNumber(summary.otherTimeHours));
  const timeSummaryText = totalTime > 0
    ? `${formatHours(totalTime)} invested • ${formatHours(setupHours)} setup • ${formatHours(maintenanceHours)} upkeep • ${formatHours(otherTimeHours)} flex`
    : 'No hours logged yet. Queue a hustle to get moving.';

  const totalEarnings = Math.max(0, clampNumber(summary.totalEarnings));
  const activeEarnings = Math.max(0, clampNumber(summary.activeEarnings));
  const passiveEarnings = Math.max(0, clampNumber(summary.passiveEarnings));
  const earningsSummaryText = totalEarnings > 0
    ? `$${formatMoney(totalEarnings)} earned • $${formatMoney(activeEarnings)} active • $${formatMoney(passiveEarnings)} passive`
    : 'Payouts will appear once you start closing deals.';

  const totalSpend = Math.max(0, clampNumber(summary.totalSpend));
  const upkeepSpend = Math.max(0, clampNumber(summary.upkeepSpend));
  const investmentSpend = Math.max(0, clampNumber(summary.investmentSpend));
  const spendSummaryText = totalSpend > 0
    ? `$${formatMoney(totalSpend)} spent • $${formatMoney(upkeepSpend)} upkeep • $${formatMoney(investmentSpend)} investments`
    : 'Outflows land here when upkeep and investments fire.';

  const knowledgeInProgress = Math.max(0, clampNumber(summary.knowledgeInProgress));
  const knowledgePending = Math.max(0, clampNumber(summary.knowledgePendingToday));
  const studySummaryText = knowledgeInProgress > 0
    ? `${knowledgeInProgress} track${knowledgeInProgress === 1 ? '' : 's'} in flight • ${knowledgePending > 0 ? `${knowledgePending} session${knowledgePending === 1 ? '' : 's'} waiting today` : 'All sessions logged today'}`
    : 'Enroll in a track to kickstart your learning streak.';

  return {
    time: {
      summary: timeSummaryText,
      entries: presentations.timeEntries,
      emptyMessage: 'Time tracking kicks off after your first action.',
      limit: 3
    },
    earnings: {
      summary: earningsSummaryText,
      active: {
        entries: presentations.earningsEntries,
        emptyMessage: 'Active gigs will report here.',
        limit: 3
      },
      passive: {
        entries: presentations.passiveEntries,
        emptyMessage: 'Passive and offline streams update after upkeep.',
        limit: 3
      }
    },
    spend: {
      summary: spendSummaryText,
      entries: presentations.spendEntries,
      emptyMessage: 'No cash out yet. Fund upkeep or buy an upgrade.',
      limit: 3
    },
    study: {
      summary: studySummaryText,
      entries: presentations.studyEntries,
      emptyMessage: 'Your courses will list here once enrolled.',
      limit: 3
    }
  };
}

function buildHeaderMetrics(state = {}, summary = {}) {
  const hoursLeft = Math.max(0, clampNumber(state.timeLeft));
  const timeCap = computeTimeCap(state);
  const dailyEarnings = Math.max(0, clampNumber(summary.totalEarnings));
  const activeEarnings = Math.max(0, clampNumber(summary.activeEarnings));
  const passiveEarnings = Math.max(0, clampNumber(summary.passiveEarnings));
  const dailySpend = Math.max(0, clampNumber(summary.totalSpend));
  const upkeepSpend = Math.max(0, clampNumber(summary.upkeepSpend));
  const investmentSpend = Math.max(0, clampNumber(summary.investmentSpend));
  const reservedHours = Math.max(0, timeCap - hoursLeft);
  const setupHours = Math.max(0, clampNumber(summary.setupHours));
  const maintenanceHours = Math.max(0, clampNumber(summary.maintenanceHours));
  const flexHours = Math.max(0, reservedHours - setupHours - maintenanceHours);

  const incomeSegments = [];
  if (activeEarnings > 0) {
    incomeSegments.push(`$${formatMoney(activeEarnings)} active`);
  }
  if (passiveEarnings > 0) {
    incomeSegments.push(`$${formatMoney(passiveEarnings)} passive`);
  }

  const spendSegments = [];
  if (upkeepSpend > 0) {
    spendSegments.push(`$${formatMoney(upkeepSpend)} upkeep`);
  }
  if (investmentSpend > 0) {
    spendSegments.push(`$${formatMoney(investmentSpend)} invest`);
  }
  const dailyNet = dailyEarnings - dailySpend;
  if (dailyNet !== 0) {
    const netLabel = `${dailyNet >= 0 ? 'Net +' : 'Net -'}$${formatMoney(Math.abs(dailyNet))}`;
    spendSegments.push(netLabel);
  }

  const reservedSegments = [];
  if (setupHours > 0) {
    reservedSegments.push(`${formatHours(setupHours)} setup`);
  }
  if (maintenanceHours > 0) {
    reservedSegments.push(`${formatHours(maintenanceHours)} upkeep`);
  }
  if (flexHours > 0) {
    reservedSegments.push(`${formatHours(flexHours)} hustle`);
  }

  return {
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
  };
}

function buildKpiStats(state = {}, summary = {}) {
  const hoursLeft = Math.max(0, clampNumber(state.timeLeft));
  const net = clampNumber(summary.totalEarnings) - clampNumber(summary.totalSpend);
  const { activeAssets, upkeepDue } = computeAssetMetrics(state);
  const { percent, summary: studySummary } = computeStudyProgress(state);

  return {
    net: {
      value: `$${formatMoney(net)}`,
      note: `${formatMoney(clampNumber(summary.totalEarnings))} earned • ${formatMoney(clampNumber(summary.totalSpend))} spent`
    },
    hours: {
      value: `${formatHours(hoursLeft)}`,
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

function buildQueueModel(summary = {}) {
  const items = describeQueue(summary).map(entry => ({
    ...entry,
    hoursLabel: formatHours(entry.hours)
  }));
  return { items };
}

function buildQuickActionModel(state = {}) {
  const suggestions = buildQuickActions(state);
  const entries = suggestions.map(action => ({
    id: action.id,
    title: action.label,
    subtitle: action.description,
    buttonLabel: action.primaryLabel,
    onClick: action.onClick,
    payout: action.payout,
    payoutText: action.payoutText,
    durationHours: action.durationHours,
    durationText: action.durationText,
    meta: action.meta,
    repeatable: action.repeatable,
    remainingRuns: action.remainingRuns
  }));
  const baseHours = clampNumber(state.baseTime) + clampNumber(state.bonusTime) + clampNumber(state.dailyBonusTime);
  const hoursAvailable = Math.max(0, clampNumber(state.timeLeft));
  const hoursSpent = Math.max(0, baseHours - hoursAvailable);
  return {
    entries,
    emptyMessage: 'No ready actions. Check upgrades or ventures.',
    buttonClass: 'primary',
    defaultLabel: 'Queue',
    hoursAvailable,
    hoursAvailableLabel: formatHours(hoursAvailable),
    hoursSpent,
    hoursSpentLabel: formatHours(hoursSpent),
    day: clampNumber(state.day),
    moneyAvailable: clampNumber(state.money)
  };
}

function buildAssetActionModel(state = {}) {
  const suggestions = buildAssetUpgradeRecommendations(state);
  const entries = suggestions.map(action => {
    const timeCost = Math.max(0, clampNumber(action.timeCost));
    return {
      id: action.id,
      title: action.title,
      subtitle: action.subtitle,
      meta: action.meta,
      metaClass: 'upgrade-actions__meta',
      buttonLabel: action.buttonLabel,
      onClick: action.onClick,
      timeCost,
      durationHours: timeCost,
      durationText: formatHours(timeCost),
      moneyCost: Math.max(0, clampNumber(action.cost)),
      repeatable: Boolean(action.repeatable),
      remainingRuns: action.remainingRuns ?? null
    };
  });
  return {
    entries,
    emptyMessage: 'Every venture is humming along. Check back after today’s upkeep.',
    buttonClass: 'secondary',
    defaultLabel: 'Boost',
    scroller: { limit: 6 },
    moneyAvailable: clampNumber(state.money)
  };
}

function buildStudyEnrollmentSuggestions(state = {}) {
  const suggestions = [];

  if (!state || typeof state !== 'object') {
    return suggestions;
  }

  for (const hustle of getHustles()) {
    if (hustle?.tag?.type !== 'study') continue;
    const action = hustle?.action;
    if (!action?.onClick) continue;

    let disabled = false;
    if (typeof action.disabled === 'function') {
      try {
        disabled = action.disabled(state);
      } catch (error) {
        disabled = true;
      }
    } else {
      disabled = Boolean(action.disabled);
    }
    if (disabled) continue;

    const timeCost = Math.max(0, clampNumber(action.timeCost ?? hustle.time));
    const tuition = Math.max(0, clampNumber(action.moneyCost));
    const metaParts = [];
    if (tuition > 0) {
      metaParts.push(`$${formatMoney(tuition)} tuition`);
    }
    if (timeCost > 0) {
      metaParts.push(`${formatHours(timeCost)} focus`);
    }

    const buttonLabel = typeof action.label === 'function'
      ? action.label(state)
      : action.label || 'Enroll';

    suggestions.push({
      id: hustle.id,
      title: hustle.name,
      subtitle: hustle.description,
      meta: metaParts.join(' • '),
      buttonLabel,
      onClick: action.onClick,
      timeCost,
      durationHours: timeCost,
      durationText: formatHours(timeCost),
      moneyCost: tuition,
      repeatable: false,
      remainingRuns: null
    });
  }

  suggestions.sort((a, b) => a.moneyCost - b.moneyCost);
  return suggestions;
}

function buildStudyEnrollmentActionModel(state = {}) {
  const safeState = state || {};
  const suggestions = buildStudyEnrollmentSuggestions(safeState);
  const entries = suggestions.map((action, index) => ({
    id: action.id || `study-${index}`,
    title: action.title,
    subtitle: action.subtitle,
    meta: action.meta,
    buttonLabel: action.buttonLabel,
    onClick: action.onClick,
    timeCost: action.timeCost,
    durationHours: action.durationHours,
    durationText: action.durationText,
    moneyCost: action.moneyCost,
    repeatable: action.repeatable,
    remainingRuns: action.remainingRuns
  }));

  const baseHours = clampNumber(safeState.baseTime) + clampNumber(safeState.bonusTime) + clampNumber(safeState.dailyBonusTime);
  const hoursAvailable = Math.max(0, clampNumber(safeState.timeLeft));
  const hoursSpent = Math.max(0, baseHours - hoursAvailable);

  return {
    entries,
    emptyMessage: 'No study tracks are ready to enroll right now.',
    moneyAvailable: clampNumber(safeState.money),
    hoursAvailable,
    hoursAvailableLabel: formatHours(hoursAvailable),
    hoursSpent,
    hoursSpentLabel: formatHours(hoursSpent)
  };
}

function buildNotificationModel(state = {}) {
  const entries = buildNotifications(state);
  return {
    entries,
    emptyMessage: 'All clear. Nothing urgent on deck.'
  };
}

function buildEventLogModel(state = {}) {
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

  return {
    session,
    headerMetrics: buildHeaderMetrics(state, summary),
    kpis: buildKpiStats(state, summary),
    queue: buildQueueModel(summary),
    quickActions: buildQuickActionModel(state),
    assetActions: buildAssetActionModel(state),
    studyActions: buildStudyEnrollmentActionModel(state),
    notifications: buildNotificationModel(state),
    eventLog: buildEventLogModel(state),
    dailyStats: buildDailyStats(summary),
    niche: buildNicheViewModel(state)
  };
}

export { buildEventLogModel };

export default {
  buildDashboardViewModel,
  buildQuickActions,
  buildAssetUpgradeRecommendations,
  buildStudyEnrollmentActionModel
};
