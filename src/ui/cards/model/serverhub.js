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
import { getUpgradeSnapshot, describeUpgradeStatus } from './upgrades.js';

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
    label: entry?.popularity?.label || '',
    multiplier: entry?.popularity?.multiplier || 1,
    score: clampNumber(entry?.popularity?.score),
    delta: Number.isFinite(Number(entry?.popularity?.delta))
      ? Number(entry?.popularity.delta)
      : null
  })).filter(option => option.id && option.name);
}

function extractRelevantUpgrades(upgrades = [], state) {
  return ensureArray(upgrades)
    .filter(upgrade => {
      const affects = upgrade?.affects?.assets;
      if (!affects) return false;
      const ids = ensureArray(affects.ids);
      if (ids.includes('saas')) return true;
      const tags = ensureArray(affects.tags);
      return tags.includes('software') || tags.includes('tech');
    })
    .map(upgrade => {
      const snapshot = getUpgradeSnapshot(upgrade, state);
      return {
        id: upgrade.id,
        name: upgrade.name,
        cost: Math.max(0, clampNumber(upgrade.cost)),
        description: upgrade.boosts || upgrade.description || '',
        tag: upgrade.tag || null,
        affects: upgrade.affects || {},
        effects: upgrade.effects || {},
        action: upgrade.action || null,
        snapshot,
        status: describeUpgradeStatus(snapshot)
      };
    });
}

function buildInstances(definition, state) {
  const assetState = getAssetState(definition.id, state) || { instances: [] };
  const instances = ensureArray(assetState.instances);
  const actions = getQualityActions(definition);
  const nicheOptions = mapNicheOptions(definition, state);
  const maintenance = formatMaintenanceSummary(definition);
  const upkeepCost = Math.max(0, clampNumber(definition?.maintenance?.cost));

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
    const actionsById = actionSnapshots.reduce((map, action) => {
      if (action?.id) {
        map[action.id] = action;
      }
      return map;
    }, {});
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
    const profit = lifetimeIncome - lifetimeSpend;
    const roi = lifetimeSpend > 0 ? profit / lifetimeSpend : null;

    const createdOnDay = Math.max(1, clampNumber(instance.createdOnDay) || 1);
    const currentDay = Math.max(1, clampNumber(state?.day) || 1);
    const daysLive = Math.max(1, currentDay - createdOnDay + 1);

    return {
      id: instance.id,
      label,
      status,
      latestPayout: Math.max(0, clampNumber(instance.lastIncome)),
      averagePayout,
      lifetimeIncome,
      lifetimeSpend,
      profit,
      roi,
      maintenanceFunded: Boolean(instance.maintenanceFundedToday),
      upkeepCost,
      pendingIncome: Math.max(0, clampNumber(instance.pendingIncome)),
      qualityLevel,
      qualityInfo: qualityInfo || null,
      qualityRange,
      milestone,
      payoutBreakdown,
      actions: actionSnapshots,
      actionsById,
      niche,
      nicheLocked: Boolean(instance.nicheId),
      nicheOptions,
      maintenance,
      definition,
      instance,
      progress: instance.quality?.progress || {},
      createdOnDay,
      daysLive
    };
  }).sort((a, b) => b.latestPayout - a.latestPayout);
}

function buildSummary(instances = [], definition, state) {
  const total = instances.length;
  const activeInstances = instances.filter(entry => entry.status?.id === 'active');
  const active = activeInstances.length;
  const setup = total - active;
  const needsUpkeep = activeInstances.filter(entry => !entry.maintenanceFunded).length;
  const dailyRevenue = activeInstances.reduce((sum, entry) => sum + entry.latestPayout, 0);
  const upkeepCost = Math.max(0, clampNumber(definition?.maintenance?.cost));
  const dailyUpkeep = active * upkeepCost;
  const netDaily = dailyRevenue - dailyUpkeep;

  let meta = '';
  if (active > 0) {
    meta = `${active} SaaS app${active === 1 ? '' : 's'} live`;
  } else if (setup > 0) {
    meta = 'Launch prep underway';
  } else {
    meta = 'Launch your first micro SaaS';
  }

  const hero = [
    {
      id: 'active',
      label: 'Total SaaS Apps Active',
      value: active,
      note: `${total} deployed`
    },
    {
      id: 'revenue',
      label: 'Daily Revenue',
      value: dailyRevenue,
      note: active > 0 ? 'Yesterday\'s subscriptions' : 'No revenue yet'
    },
    {
      id: 'upkeep',
      label: 'Daily Upkeep',
      value: dailyUpkeep,
      note: active > 0 ? 'Server & support budget' : 'No upkeep'
    },
    {
      id: 'net',
      label: 'Net Daily Flow',
      value: netDaily,
      note: netDaily >= 0 ? 'Cash-positive momentum' : 'Cover upkeep soon'
    }
  ];

  return {
    total,
    active,
    setup,
    needsUpkeep,
    dailyRevenue,
    dailyUpkeep,
    netDaily,
    hero,
    meta
  };
}

function buildLaunch(definition, state) {
  const availability = describeAssetLaunchAvailability(definition, state);
  const launchAction = definition.action || null;
  if (!launchAction) {
    return {
      label: `Deploy ${definition.singular || definition.name || 'app'}`,
      disabled: availability.disabled,
      availability,
      onClick: null
    };
  }

  return {
    label: typeof launchAction.label === 'function' ? launchAction.label(state) : launchAction.label,
    disabled: typeof launchAction.disabled === 'function'
      ? launchAction.disabled(state)
      : Boolean(launchAction.disabled),
    availability,
    onClick: launchAction.onClick || null
  };
}

function buildPricingPlans(definition) {
  if (!definition?.quality?.levels) {
    return [];
  }
  const levels = ensureArray(definition.quality.levels);
  const starter = levels.find(level => level.level === 0) || levels[0] || null;
  const growth = levels.find(level => level.level === 3) || levels[Math.min(levels.length - 1, 2)] || null;
  const enterprise = levels.find(level => level.level === 5) || levels.at(-1) || null;

  const setup = {
    cost: Math.max(0, clampNumber(definition?.setup?.cost)),
    days: Math.max(0, clampNumber(definition?.setup?.days)),
    hoursPerDay: Math.max(0, clampNumber(definition?.setup?.hoursPerDay))
  };
  const upkeep = {
    cost: Math.max(0, clampNumber(definition?.maintenance?.cost)),
    hours: Math.max(0, clampNumber(definition?.maintenance?.hours))
  };

  const describePlan = (id, title, level, copy) => {
    if (!level) return null;
    return {
      id,
      title,
      summary: copy,
      payout: level.income || {},
      setup,
      upkeep
    };
  };

  return [
    describePlan('starter', 'Starter Instance', starter, 'Lean feature set, perfect for validating ideas.'),
    describePlan('growth', 'Growth App', growth, 'Heavier traffic support and marketing momentum.'),
    describePlan('enterprise', 'Enterprise Node', enterprise, 'Edge-hardened and ready for global SLAs.')
  ].filter(Boolean);
}

export default function buildServerHubModel(assetDefinitions = [], upgradeDefinitions = [], state = getState()) {
  const definitionMap = new Map(ensureArray(assetDefinitions).map(definition => [definition?.id, definition]));
  const saasDefinition = definitionMap.get('saas') || null;

  if (!saasDefinition) {
    return {
      definition: null,
      instances: [],
      summary: { meta: 'Launch your first micro SaaS' },
      launch: null,
      upgrades: [],
      pricing: []
    };
  }

  const instances = buildInstances(saasDefinition, state);
  const summary = buildSummary(instances, saasDefinition, state);
  const launch = buildLaunch(saasDefinition, state);
  const upgrades = extractRelevantUpgrades(upgradeDefinitions, state);
  const pricing = buildPricingPlans(saasDefinition);

  return {
    definition: saasDefinition,
    instances,
    summary,
    launch,
    upgrades,
    pricing
  };
}

export function selectServerHubNiche(assetId, instanceId, nicheId) {
  return assignInstanceToNiche(assetId, instanceId, nicheId);
}
