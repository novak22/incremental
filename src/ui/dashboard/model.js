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

function clampNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function computeTimeCap(state = {}) {
  const base = clampNumber(state.baseTime);
  const bonus = clampNumber(state.bonusTime);
  const daily = clampNumber(state.dailyBonusTime);
  return Math.max(0, base + bonus + daily);
}

function describeQueue(summary = {}) {
  const entries = Array.isArray(summary.timeBreakdown) ? summary.timeBreakdown : [];
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
  for (const hustle of registry.hustles) {
    if (hustle?.tag?.type === 'study') continue;
    if (!hustle?.action?.onClick) continue;
    const disabled = typeof hustle.action.disabled === 'function'
      ? hustle.action.disabled(state)
      : Boolean(hustle.action.disabled);
    if (disabled) continue;
    const payout = clampNumber(hustle.payout?.amount);
    const time = clampNumber(hustle.time || hustle.action?.timeCost) || 1;
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

function computeAssetMetrics(state = {}) {
  let activeAssets = 0;
  let upkeepDue = 0;

  for (const asset of registry.assets) {
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

  for (const asset of registry.assets) {
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

  const affordableUpgrades = registry.upgrades.filter(upgrade => {
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

function buildEventLog(state = {}) {
  const log = Array.isArray(state.log) ? [...state.log] : [];
  if (!log.length) {
    return [];
  }

  return log
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 4)
    .map(entry => ({
      id: entry.id || `log:${entry.timestamp}`,
      timestamp: entry.timestamp,
      message: entry.message,
      timeLabel: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
}

function buildDailyStats(summary = {}) {
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
      entries: Array.isArray(summary.timeBreakdown) ? summary.timeBreakdown : [],
      emptyMessage: 'Time tracking kicks off after your first action.',
      limit: 3
    },
    earnings: {
      summary: earningsSummaryText,
      active: {
        entries: Array.isArray(summary.earningsBreakdown) ? summary.earningsBreakdown : [],
        emptyMessage: 'Active gigs will report here.',
        limit: 3
      },
      passive: {
        entries: Array.isArray(summary.passiveBreakdown) ? summary.passiveBreakdown : [],
        emptyMessage: 'Passive and offline streams update after upkeep.',
        limit: 3
      }
    },
    spend: {
      summary: spendSummaryText,
      entries: Array.isArray(summary.spendBreakdown) ? summary.spendBreakdown : [],
      emptyMessage: 'No cash out yet. Fund upkeep or buy an upgrade.',
      limit: 3
    },
    study: {
      summary: studySummaryText,
      entries: Array.isArray(summary.studyBreakdown) ? summary.studyBreakdown : [],
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
    onClick: action.onClick
  }));
  return {
    entries,
    emptyMessage: 'No ready actions. Check upgrades or ventures.',
    buttonClass: 'primary',
    defaultLabel: 'Queue'
  };
}

function buildAssetActionModel(state = {}) {
  const suggestions = buildAssetUpgradeRecommendations(state);
  const entries = suggestions.map(action => ({
    id: action.id,
    title: action.title,
    subtitle: action.subtitle,
    meta: action.meta,
    metaClass: 'upgrade-actions__meta',
    buttonLabel: action.buttonLabel,
    onClick: action.onClick
  }));
  return {
    entries,
    emptyMessage: 'Every venture is humming along. Check back after today’s upkeep.',
    buttonClass: 'secondary',
    defaultLabel: 'Boost'
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
  const entries = buildEventLog(state);
  return {
    entries,
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
    notifications: buildNotificationModel(state),
    eventLog: buildEventLogModel(state),
    dailyStats: buildDailyStats(summary)
  };
}

export default {
  buildDashboardViewModel,
  buildQuickActions,
  buildAssetUpgradeRecommendations
};
