import { ensureArray, formatHours, formatMoney } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { calculateAssetSalePrice } from '../../../game/assets/actions.js';
import { formatMaintenanceSummary } from '../../../game/assets/maintenance.js';
import {
  assignInstanceToNiche,
} from '../../../game/assets/niches.js';
import {
  canPerformQualityAction,
  getNextQualityLevel,
  getQualityActionAvailability,
  getQualityActionUsage,
  getQualityTracks
} from '../../../game/assets/quality.js';
import { getUpgradeSnapshot, describeUpgradeStatus } from './upgrades.js';
import { describeAssetLaunchAvailability } from './assets.js';
import { registerModelBuilder } from '../modelBuilderRegistry.js';
import { buildSkillLock } from './skillLocks.js';
import {
  buildDefaultSummary
} from './sharedAssetInstances.js';
import createAssetInstanceSnapshots from './createAssetInstanceSnapshots.js';

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
      summary: 'Quality ladder maxed — future milestones queue for future updates.',
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
    : 'No requirements — milestone can trigger immediately.';

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
    const remaining = Math.max(0, clampNumber(instance?.daysRemaining));
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

function extractRelevantUpgrades(upgrades = [], state) {
  return ensureArray(upgrades)
    .filter(upgrade => {
      const affects = upgrade?.affects?.assets;
      if (!affects) return false;
      const ids = ensureArray(affects.ids);
      if (ids.includes('dropshipping')) return true;
      const tags = ensureArray(affects.tags);
      return tags.includes('commerce') || tags.includes('ecommerce');
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
        definition: upgrade,
        boosts: upgrade.boosts || '',
        snapshot,
        status: describeUpgradeStatus(snapshot)
      };
    });
}

function buildShopInstances(definition, state) {
  const maintenance = formatMaintenanceSummary(definition);

  return createAssetInstanceSnapshots(definition, state, {
    includeNicheDelta: true,
    maintenanceSummary: maintenance,
    maintenanceCostKey: 'maintenanceCost',
    buildMilestone: (assetDefinition, instance) => buildMilestoneProgress(assetDefinition, instance),
    buildActionSnapshot: (assetDefinition, instance, action, ctxState) =>
      buildActionSnapshot(assetDefinition, instance, action, ctxState),
    quickActionSelector: actionSnapshots =>
      actionSnapshots.find(entry => entry.available) || actionSnapshots[0] || null,
    decorate: (snapshot, { instance }) => ({
      ...snapshot,
      resaleValue: Math.max(0, clampNumber(calculateAssetSalePrice(instance)))
    })
  });
}

function buildSummary(instances = []) {
  return buildDefaultSummary(instances, {
    fallbackLabel: 'store',
    includeNeedsUpkeep: true,
    activeMeta: ({ active, fallbackLabel }) => `${active} ${fallbackLabel}${active === 1 ? '' : 's'} selling today`
  });
}

function buildMetrics(instances = [], definition) {
  const totalStores = instances.length;
  const dailySales = instances.reduce((sum, entry) => sum + (Number(entry.latestPayout) || 0), 0);
  const upkeepCost = Math.max(0, clampNumber(definition?.maintenance?.cost));
  const activeStores = instances.filter(entry => entry.status?.id === 'active').length;
  const dailyUpkeep = upkeepCost * activeStores;
  const netDaily = dailySales - dailyUpkeep;
  return {
    totalStores,
    dailySales,
    dailyUpkeep,
    netDaily
  };
}

function buildPricing(definition, state) {
  const setup = definition?.setup || {};
  const maintenance = definition?.maintenance || {};
  const qualityLevels = ensureArray(definition?.quality?.levels);
  const starterIncome = qualityLevels[0]?.income || {};
  const premiumIncome = qualityLevels[qualityLevels.length - 1]?.income || starterIncome;
  const midIncome = qualityLevels[Math.floor(qualityLevels.length / 2)]?.income || starterIncome;

  const averageRange = income => {
    const min = Math.max(0, clampNumber(income?.min));
    const max = Math.max(0, clampNumber(income?.max));
    if (max <= 0 && min <= 0) return '$0/day';
    if (min === max) return `$${formatMoney(min)}/day`;
    return `$${formatMoney(min)}–$${formatMoney(max)}/day`;
  };

  return {
    plans: [
      {
        id: 'starter',
        name: 'Starter Store',
        summary: 'Cut your teeth on a focused catalog, basic ad tests, and scrappy automation.',
        setupCost: Math.max(0, clampNumber(setup.cost)),
        setupDays: Math.max(0, clampNumber(setup.days)),
        setupHours: Math.max(0, clampNumber(setup.hoursPerDay)),
        upkeepCost: Math.max(0, clampNumber(maintenance.cost)),
        upkeepHours: Math.max(0, clampNumber(maintenance.hours)),
        expectedSales: averageRange(starterIncome)
      },
      {
        id: 'growth',
        name: 'Growth Store',
        summary: 'Layer on better suppliers and faster shipping once automation upgrades go live.',
        setupCost: Math.max(0, clampNumber(setup.cost)) + 520,
        setupDays: Math.max(0, clampNumber(setup.days)) + 1,
        setupHours: Math.max(0, clampNumber(setup.hoursPerDay)) + 0.5,
        upkeepCost: Math.max(0, clampNumber(maintenance.cost)) + 6,
        upkeepHours: Math.max(0, clampNumber(maintenance.hours)) + 0.4,
        expectedSales: averageRange(midIncome)
      },
      {
        id: 'premium',
        name: 'Premium Brand',
        summary: 'High-ticket bundles, premium themes, and white-label alliances drive thunderous ROI.',
        setupCost: Math.max(0, clampNumber(setup.cost)) + 1480,
        setupDays: Math.max(0, clampNumber(setup.days)) + 2,
        setupHours: Math.max(0, clampNumber(setup.hoursPerDay)) + 1,
        upkeepCost: Math.max(0, clampNumber(maintenance.cost)) + 14,
        upkeepHours: Math.max(0, clampNumber(maintenance.hours)) + 0.6,
        expectedSales: averageRange(premiumIncome)
      }
    ]
  };
}

function buildShopilyModel(assetDefinitions = [], upgradeDefinitions = [], state = getState()) {
  const definition = ensureArray(assetDefinitions).find(entry => entry?.id === 'dropshipping') || null;
  if (!definition) {
    return {
      definition: null,
      instances: [],
      summary: { total: 0, active: 0, setup: 0, needsUpkeep: 0, meta: 'Shopily locked' },
      metrics: { totalStores: 0, dailySales: 0, dailyUpkeep: 0, netDaily: 0 },
      pricing: null,
      upgrades: [],
      launch: null
    };
  }

  const lock = buildSkillLock(state, 'shopily');
  if (lock) {
    return {
      definition: null,
      instances: [],
      summary: { total: 0, active: 0, setup: 0, needsUpkeep: 0, meta: lock.meta },
      metrics: { totalStores: 0, dailySales: 0, dailyUpkeep: 0, netDaily: 0 },
      pricing: null,
      upgrades: [],
      launch: null,
      lock
    };
  }

  const instances = buildShopInstances(definition, state);
  const summary = buildSummary(instances);
  const metrics = buildMetrics(instances, definition);
  const pricing = buildPricing(definition, state);
  const upgrades = extractRelevantUpgrades(upgradeDefinitions, state);
  const availability = describeAssetLaunchAvailability(definition, state);
  const launchAction = definition.action || null;
  const launch = launchAction
    ? {
        label: typeof launchAction.label === 'function' ? launchAction.label(state) : launchAction.label,
        disabled: typeof launchAction.disabled === 'function'
          ? launchAction.disabled(state)
          : Boolean(launchAction.disabled),
        availability,
        onClick: launchAction.onClick || null
      }
    : {
        label: 'Launch Dropshipping Store',
        disabled: availability.disabled,
        availability,
        onClick: null
      };

  return {
    definition,
    instances,
    summary,
    metrics,
    pricing,
    upgrades,
    launch
  };
}

export function selectNiche(assetId, instanceId, nicheId) {
  return assignInstanceToNiche(assetId, instanceId, nicheId);
}

registerModelBuilder(
  'shopily',
  (registries = {}, context = {}) =>
    buildShopilyModel(registries.assets ?? [], registries.upgrades ?? [], context.state)
);
