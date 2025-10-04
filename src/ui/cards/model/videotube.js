import { ensureArray, formatHours, formatMoney } from '../../../core/helpers.js';
import { getAssetState, getState } from '../../../core/state.js';
import { instanceLabel } from '../../../game/assets/details.js';
import { formatMaintenanceSummary } from '../../../game/assets/maintenance.js';
import {
  assignInstanceToNiche,
  getAssignableNicheSummaries,
  getInstanceNicheInfo
} from '../../../game/assets/niches.js';
import {
  canPerformQualityAction,
  getInstanceQualityRange,
  getNextQualityLevel,
  getQualityActionAvailability,
  getQualityActionUsage,
  getQualityActions,
  getQualityLevel,
  getQualityTracks
} from '../../../game/assets/quality.js';
import { setAssetInstanceName } from '../../../game/assets/actions.js';
import { describeAssetLaunchAvailability } from './assets.js';
import { registerModelBuilder } from '../modelBuilderRegistry.js';
import { buildSkillLock } from './skillLocks.js';

function clampNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(amount) {
  return `$${formatMoney(Math.max(0, Math.round(Number(amount) || 0)))}`;
}

function buildMilestoneProgress(definition, instance) {
  const quality = instance?.quality || {};
  const level = Math.max(0, clampNumber(quality.level));
  const nextLevel = getNextQualityLevel(definition, level);
  const tracks = getQualityTracks(definition);
  const progress = quality.progress || {};

  if (!nextLevel?.requirements) {
    return {
      level,
      percent: 1,
      summary: 'Maxed out — production is at peak polish.',
      nextLevel: null,
      steps: []
    };
  }

  let totalGoal = 0;
  let totalCurrent = 0;
  const steps = [];

  Object.entries(nextLevel.requirements).forEach(([key, rawGoal]) => {
    const goal = Math.max(0, clampNumber(rawGoal));
    if (goal <= 0) return;
    const current = Math.max(0, clampNumber(progress?.[key]));
    const capped = Math.min(current, goal);
    totalGoal += goal;
    totalCurrent += capped;
    const track = tracks?.[key] || {};
    const label = track.shortLabel || track.label || key;
    steps.push({
      key,
      label,
      current: capped,
      goal
    });
  });

  const percent = totalGoal > 0 ? Math.min(1, totalCurrent / totalGoal) : 1;
  const summary = steps.length
    ? steps.map(step => `${step.current}/${step.goal} ${step.label}`).join(' • ')
    : 'No requirements — milestone ready to fire.';

  return {
    level,
    percent,
    summary,
    nextLevel,
    steps
  };
}

function buildActionSnapshot(definition, instance, action, state) {
  const timeCost = Math.max(0, clampNumber(action.time));
  const moneyCost = Math.max(0, clampNumber(action.cost));
  const usage = getQualityActionUsage(definition, instance, action);
  const availability = getQualityActionAvailability(definition, instance, action, state);
  const unlocked = Boolean(availability?.unlocked);
  const canRun = canPerformQualityAction(definition, instance, action, state);
  let disabledReason = '';
  const tracks = getQualityTracks(definition);
  const track = action.progressKey ? tracks?.[action.progressKey] : null;
  const rawAmount = typeof action.progressAmount === 'function'
    ? action.progressAmount({ definition, instance })
    : Number(action.progressAmount);
  const effectAmount = Number.isFinite(rawAmount) && rawAmount !== 0 ? rawAmount : 1;
  const effect = track
    ? `+${effectAmount} ${track.shortLabel || track.label}`
    : 'Boosts quality momentum';

  if (instance.status !== 'active') {
    const remaining = Math.max(0, clampNumber(instance.daysRemaining));
    disabledReason = remaining > 0
      ? `Launch wraps in ${remaining} day${remaining === 1 ? '' : 's'}`
      : 'Launch finishing up soon';
  } else if (!unlocked) {
    disabledReason = availability?.reason || 'Requires an upgrade first.';
  } else if (usage.remainingUses <= 0) {
    disabledReason = 'Daily limit hit — try again tomorrow.';
  } else if (timeCost > 0 && state.timeLeft < timeCost) {
    disabledReason = `Need ${formatHours(timeCost)} free.`;
  } else if (moneyCost > 0 && state.money < moneyCost) {
    disabledReason = `Need $${formatMoney(moneyCost)} on hand.`;
  }

  return {
    id: action.id,
    label: action.label || 'Quality push',
    time: timeCost,
    cost: moneyCost,
    available: canRun,
    unlocked,
    usage,
    disabledReason,
    skills: action.skills || [],
    description: action.description || '',
    effect
  };
}

function calculateAveragePayout(instance, state) {
  if (!instance || instance.status !== 'active') {
    return 0;
  }
  const totalIncome = Math.max(0, clampNumber(instance.totalIncome));
  const createdOnDay = Math.max(1, clampNumber(instance.createdOnDay) || 1);
  const currentDay = Math.max(1, clampNumber(state?.day) || 1);
  const daysActive = Math.max(1, currentDay - createdOnDay + 1);
  if (totalIncome <= 0) {
    return 0;
  }
  return totalIncome / daysActive;
}

function describeStatus(instance, definition) {
  const status = instance?.status === 'active' ? 'active' : 'setup';
  if (status === 'active') {
    return { id: 'active', label: 'Active' };
  }
  const totalDays = Math.max(0, clampNumber(definition?.setup?.days));
  const completed = Math.max(0, clampNumber(instance?.daysCompleted));
  const progress = totalDays > 0 ? Math.min(1, completed / totalDays) : 0;
  return {
    id: 'setup',
    label: `Setup ${completed}/${totalDays} days`,
    remaining: Math.max(0, clampNumber(instance?.daysRemaining)),
    progress
  };
}

function estimateLifetimeSpend(definition, instance, state) {
  const setupCost = Math.max(0, clampNumber(definition?.setup?.cost));
  const upkeepCost = Math.max(0, clampNumber(definition?.maintenance?.cost));
  if (upkeepCost <= 0) {
    return setupCost;
  }
  const createdOnDay = Math.max(1, clampNumber(instance?.createdOnDay) || 1);
  const currentDay = Math.max(1, clampNumber(state?.day) || 1);
  const elapsedDays = Math.max(0, currentDay - createdOnDay + 1);
  return setupCost + upkeepCost * elapsedDays;
}

function buildPayoutBreakdown(instance) {
  const breakdown = instance?.lastIncomeBreakdown;
  const entries = ensureArray(breakdown?.entries).map(entry => ({
    id: entry?.id || entry?.label || 'modifier',
    label: entry?.label || 'Modifier',
    amount: Math.max(0, clampNumber(entry?.amount)),
    percent: Number.isFinite(Number(entry?.percent)) ? Number(entry.percent) : null,
    type: entry?.type || 'modifier'
  }));
  const total = Math.max(0, clampNumber(breakdown?.total || instance?.lastIncome));
  return { entries, total };
}

function mapNicheOptions(definition, state) {
  return ensureArray(getAssignableNicheSummaries(definition, state))
    .map(entry => ({
      id: entry?.definition?.id || '',
      name: entry?.definition?.name || entry?.definition?.id || '',
      summary: entry?.popularity?.summary || '',
      label: entry?.popularity?.label || '',
      multiplier: entry?.popularity?.multiplier || 1,
      score: clampNumber(entry?.popularity?.score),
      delta: Number.isFinite(Number(entry?.popularity?.delta))
        ? Number(entry.popularity.delta)
        : null
    }))
    .filter(option => option.id && option.name);
}

function computeRoi(lifetimeIncome, lifetimeSpend) {
  const income = Math.max(0, clampNumber(lifetimeIncome));
  const spend = Math.max(0, clampNumber(lifetimeSpend));
  if (spend <= 0) return null;
  return (income - spend) / spend;
}

function buildVideoInstances(definition, state) {
  const assetState = getAssetState('vlog', state) || { instances: [] };
  const instances = ensureArray(assetState.instances);
  const actions = getQualityActions(definition);
  const maintenance = formatMaintenanceSummary(definition);
  const nicheOptions = mapNicheOptions(definition, state);

  return instances.map((instance, index) => {
    const fallbackLabel = instanceLabel(definition, index);
    const customName = typeof instance.customName === 'string' && instance.customName.trim()
      ? instance.customName.trim()
      : '';
    const label = customName || fallbackLabel;
    const status = describeStatus(instance, definition);
    const averagePayout = calculateAveragePayout(instance, state);
    const qualityLevel = Math.max(0, clampNumber(instance?.quality?.level));
    const qualityInfo = getQualityLevel(definition, qualityLevel);
    const milestone = buildMilestoneProgress(definition, instance);
    const qualityRange = getInstanceQualityRange(definition, instance);
    const payoutBreakdown = buildPayoutBreakdown(instance);
    const actionSnapshots = actions.map(action => buildActionSnapshot(definition, instance, action, state));
    const quickAction = actionSnapshots.find(entry => entry.available) || actionSnapshots[0] || null;
    const nicheInfo = getInstanceNicheInfo(instance, state);
    const niche = nicheInfo
      ? {
          id: nicheInfo.definition?.id || '',
          name: nicheInfo.definition?.name || nicheInfo.definition?.id || '',
          summary: nicheInfo.popularity?.summary || '',
          label: nicheInfo.popularity?.label || '',
          multiplier: nicheInfo.popularity?.multiplier || 1,
          score: clampNumber(nicheInfo.popularity?.score),
          delta: Number.isFinite(Number(nicheInfo.popularity?.delta))
            ? Number(nicheInfo.popularity.delta)
            : null
        }
      : null;

    const lifetimeIncome = Math.max(0, clampNumber(instance.totalIncome));
    const lifetimeSpend = estimateLifetimeSpend(definition, instance, state);

    return {
      id: instance.id,
      label,
      fallbackLabel,
      customName,
      status,
      latestPayout: Math.max(0, clampNumber(instance.lastIncome)),
      averagePayout,
      lifetimeIncome,
      lifetimeSpend,
      roi: computeRoi(lifetimeIncome, lifetimeSpend),
      estimatedSpend: lifetimeSpend,
      maintenanceFunded: Boolean(instance.maintenanceFundedToday),
      pendingIncome: Math.max(0, clampNumber(instance.pendingIncome)),
      qualityLevel,
      qualityInfo: qualityInfo || null,
      qualityRange,
      milestone,
      payoutBreakdown,
      actions: actionSnapshots,
      quickAction,
      niche,
      nicheLocked: Boolean(instance.nicheId),
      nicheOptions,
      maintenance,
      definition,
      instance
    };
  });
}

function buildSummary(instances = []) {
  const total = instances.length;
  const active = instances.filter(entry => entry.status?.id === 'active').length;
  const setup = total - active;
  let meta = '';
  if (active > 0) {
    meta = `${active} video${active === 1 ? '' : 's'} live`;
  } else if (setup > 0) {
    meta = 'Launch prep underway';
  } else {
    meta = 'Launch your first video';
  }
  return { total, active, setup, meta };
}

function buildStats(instances = []) {
  if (!instances.length) {
    return {
      lifetime: 0,
      daily: 0,
      active: 0,
      averageQuality: 0,
      milestonePercent: 0
    };
  }

  const lifetime = instances.reduce((sum, entry) => sum + (Number(entry.lifetimeIncome) || 0), 0);
  const daily = instances.reduce((sum, entry) => sum + (Number(entry.latestPayout) || 0), 0);
  const active = instances.filter(entry => entry.status?.id === 'active').length;
  const milestonePercent = instances.reduce((sum, entry) => sum + (Number(entry.milestone?.percent) || 0), 0) / instances.length;
  const maxLevel = instances.reduce((max, entry) => Math.max(max, Number(entry.definition?.quality?.levels?.length || 6) - 1), 0);
  const avgQualityRaw = instances.reduce((sum, entry) => sum + (Number(entry.qualityLevel) || 0), 0) / instances.length;
  const averageQuality = maxLevel > 0 ? Math.min(1, avgQualityRaw / maxLevel) : 0;

  return {
    lifetime,
    daily,
    active,
    averageQuality,
    milestonePercent
  };
}

function buildAnalytics(instances = []) {
  const byVideo = instances
    .map(entry => ({
      id: entry.id,
      label: entry.label,
      lifetime: entry.lifetimeIncome,
      latest: entry.latestPayout,
      average: entry.averagePayout,
      roi: entry.roi,
      niche: entry.niche?.name || 'No niche',
      quality: entry.qualityLevel
    }))
    .sort((a, b) => b.lifetime - a.lifetime);

  const nicheMap = new Map();
  byVideo.forEach(entry => {
    const key = entry.niche || 'No niche';
    const existing = nicheMap.get(key) || { niche: key, lifetime: 0, daily: 0 };
    existing.lifetime += entry.lifetime;
    existing.daily += entry.latest;
    nicheMap.set(key, existing);
  });

  return {
    videos: byVideo,
    niches: Array.from(nicheMap.values()).sort((a, b) => b.lifetime - a.lifetime)
  };
}

function startVideoInstance(definition, options = {}, state = getState()) {
  if (!definition?.action?.onClick) return null;
  const before = new Set(
    ensureArray(getAssetState('vlog', state)?.instances).map(instance => instance?.id).filter(Boolean)
  );

  definition.action.onClick();

  const assetState = getAssetState('vlog');
  const afterInstances = ensureArray(assetState?.instances);
  const newInstance = afterInstances.find(instance => instance && !before.has(instance.id));
  if (!newInstance) {
    return null;
  }

  const name = typeof options.name === 'string' ? options.name.trim() : '';
  if (name) {
    setAssetInstanceName('vlog', newInstance.id, name);
  }
  if (options.nicheId) {
    assignInstanceToNiche('vlog', newInstance.id, options.nicheId);
  }

  return newInstance.id;
}

function buildVideoTubeModel(assetDefinitions = [], state = getState()) {
  const definition = ensureArray(assetDefinitions).find(entry => entry?.id === 'vlog') || null;
  if (!definition) {
    return {
      definition: null,
      instances: [],
      summary: { total: 0, active: 0, setup: 0, meta: 'VideoTube locked' },
      stats: { lifetime: 0, daily: 0, active: 0, averageQuality: 0, milestonePercent: 0 },
      analytics: { videos: [], niches: [] },
      launch: null
    };
  }

  const lock = buildSkillLock(state, 'videotube');
  if (lock) {
    return {
      definition: null,
      instances: [],
      summary: { total: 0, active: 0, setup: 0, meta: lock.meta },
      stats: { lifetime: 0, daily: 0, active: 0, averageQuality: 0, milestonePercent: 0 },
      analytics: { videos: [], niches: [] },
      launch: null,
      lock
    };
  }

  const instances = buildVideoInstances(definition, state);
  const summary = buildSummary(instances);
  const stats = buildStats(instances);
  const analytics = buildAnalytics(instances);
  const availability = describeAssetLaunchAvailability(definition, state);
  const launchAction = definition.action || null;
  const defaultName = `Video #${instances.length + 1}`;
  const nicheOptions = mapNicheOptions(definition, state);

  const launch = launchAction
    ? {
        label: typeof launchAction.label === 'function' ? launchAction.label(state) : launchAction.label,
        disabled: typeof launchAction.disabled === 'function'
          ? launchAction.disabled(state)
          : Boolean(launchAction.disabled),
        availability,
        setup: definition.setup || {},
        maintenance: definition.maintenance || {},
        defaultName,
        nicheOptions,
        create: options => startVideoInstance(definition, options, state)
      }
    : {
        label: 'Launch Video',
        disabled: availability.disabled,
        availability,
        setup: definition.setup || {},
        maintenance: definition.maintenance || {},
        defaultName,
        nicheOptions,
        create: () => null
      };

  return {
    definition,
    instances,
    summary,
    stats,
    analytics,
    launch
  };
}

export function selectNiche(assetId, instanceId, nicheId) {
  return assignInstanceToNiche(assetId, instanceId, nicheId);
}

registerModelBuilder(
  'videotube',
  (registries = {}, context = {}) =>
    buildVideoTubeModel(registries.assets ?? [], context.state)
);
