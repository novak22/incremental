import { ensureArray, formatHours, formatMoney } from '../../../core/helpers.js';
import { getAssetState, getState } from '../../../core/state.js';
import { instanceLabel, formatMaintenanceSummary } from '../../../game/assets/helpers.js';
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
import { describeAssetLaunchAvailability } from './assets.js';

function clampNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
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
      summary: 'Maxed out — future milestones queued for future builds.',
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
    : 'No requirements — quality milestone is ready to trigger.';

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

  if (instance.status !== 'active') {
    const remaining = Math.max(0, clampNumber(instance.daysRemaining));
    disabledReason = remaining > 0
      ? `Launch finishes in ${remaining} day${remaining === 1 ? '' : 's'}`
      : 'Launch prep wrapping up soon';
  } else if (!unlocked) {
    disabledReason = availability?.reason || 'Requires an upgrade first.';
  } else if (usage.remainingUses <= 0) {
    disabledReason = 'Daily limit reached — try again tomorrow.';
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
    skills: action.skills || []
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
  const remaining = Math.max(0, clampNumber(instance?.daysRemaining));
  const progress = totalDays > 0 ? Math.min(1, completed / totalDays) : 0;
  return {
    id: 'setup',
    label: `Setup ${completed}/${totalDays} days`,
    remaining,
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
  return ensureArray(getAssignableNicheSummaries(definition, state)).map(entry => ({
    id: entry?.definition?.id || '',
    name: entry?.definition?.name || entry?.definition?.id || '',
    summary: entry?.popularity?.summary || '',
    score: clampNumber(entry?.popularity?.score),
    label: entry?.popularity?.label || '',
    multiplier: entry?.popularity?.multiplier || 1
  })).filter(option => option.id && option.name);
}

function extractRelevantUpgrades(upgrades = []) {
  return ensureArray(upgrades)
    .filter(upgrade => {
      const affects = upgrade?.affects?.assets;
      if (!affects) return false;
      const ids = ensureArray(affects.ids);
      if (ids.includes('blog')) return true;
      const tags = ensureArray(affects.tags);
      return tags.includes('writing') || tags.includes('content');
    })
    .map(upgrade => ({
      id: upgrade.id,
      name: upgrade.name,
      cost: Math.max(0, clampNumber(upgrade.cost)),
      description: upgrade.boosts || upgrade.description || '',
      type: upgrade.tag?.label || 'Upgrade'
    }));
}

function buildBlogInstances(definition, state) {
  const assetState = getAssetState('blog', state) || { instances: [] };
  const instances = ensureArray(assetState.instances);
  const actions = getQualityActions(definition);
  const nicheOptions = mapNicheOptions(definition, state);
  const maintenance = formatMaintenanceSummary(definition);

  return instances.map((instance, index) => {
    const label = instanceLabel(definition, index);
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

    return {
      id: instance.id,
      label,
      status,
      latestPayout: Math.max(0, clampNumber(instance.lastIncome)),
      averagePayout,
      lifetimeIncome: Math.max(0, clampNumber(instance.totalIncome)),
      estimatedSpend: estimateLifetimeSpend(definition, instance, state),
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

function buildPricing(definition, upgrades = [], state) {
  const setup = definition?.setup || {};
  const maintenance = definition?.maintenance || {};
  const quality = definition?.quality || {};
  const levels = ensureArray(quality.levels).map(level => ({
    level: level.level,
    name: level.name,
    description: level.description,
    income: {
      min: Math.max(0, clampNumber(level.income?.min)),
      max: Math.max(0, clampNumber(level.income?.max))
    }
  }));
  const actions = ensureArray(quality.actions).map(action => ({
    id: action.id,
    label: action.label || 'Quality action',
    time: Math.max(0, clampNumber(action.time)),
    cost: Math.max(0, clampNumber(action.cost))
  }));
  const upgradesList = extractRelevantUpgrades(upgrades);
  const nicheOptions = mapNicheOptions(definition, state).sort((a, b) => b.score - a.score);

  return {
    setup,
    maintenance,
    levels,
    actions,
    upgrades: upgradesList,
    topNiches: nicheOptions.slice(0, 3),
    nicheCount: nicheOptions.length
  };
}

function buildSummary(instances = []) {
  const total = instances.length;
  const active = instances.filter(entry => entry.status?.id === 'active').length;
  const setup = total - active;
  const needsUpkeep = instances.filter(entry => !entry.maintenanceFunded && entry.status?.id === 'active').length;
  let meta = '';
  if (active > 0) {
    meta = `${active} blog${active === 1 ? '' : 's'} live`;
  } else if (setup > 0) {
    meta = 'Launch prep in progress';
  } else {
    meta = 'Launch your first blog';
  }
  return { total, active, setup, needsUpkeep, meta };
}

export default function buildBlogpressModel(assetDefinitions = [], upgradeDefinitions = [], state = getState()) {
  const definition = ensureArray(assetDefinitions).find(entry => entry?.id === 'blog') || null;
  if (!definition) {
    return {
      definition: null,
      instances: [],
      summary: { total: 0, active: 0, setup: 0, needsUpkeep: 0, meta: 'BlogPress locked' },
      pricing: null,
      launch: null
    };
  }

  const instances = buildBlogInstances(definition, state);
  const summary = buildSummary(instances);
  const pricing = buildPricing(definition, upgradeDefinitions, state);
  const availability = describeAssetLaunchAvailability(definition, state);
  const launchAction = definition.action || null;
  const launch = launchAction
    ? {
        label: typeof launchAction.label === 'function' ? launchAction.label(state) : launchAction.label,
        disabled: typeof launchAction.disabled === 'function' ? launchAction.disabled(state) : Boolean(launchAction.disabled),
        onClick: launchAction.onClick || null,
        availability
      }
    : {
        label: 'Launch Blog',
        disabled: availability.disabled,
        onClick: null,
        availability
      };

  return {
    definition,
    instances,
    summary,
    pricing,
    launch
  };
}

export function selectNiche(assetId, instanceId, nicheId) {
  return assignInstanceToNiche(assetId, instanceId, nicheId);
}
