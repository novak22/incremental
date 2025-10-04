import { ensureArray } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { formatMaintenanceSummary } from '../../../game/assets/maintenance.js';
import {
  assignInstanceToNiche
} from '../../../game/assets/niches.js';
import { describeAssetLaunchAvailability } from './assets.js';
import { registerModelBuilder } from '../modelBuilderRegistry.js';
import { getUpgradeSnapshot, describeUpgradeStatus } from './upgrades.js';
import { buildSkillLock } from './skillLocks.js';
import {
  clampNumber,
  buildMilestoneProgress
} from './sharedQuality.js';
import {
  buildDefaultSummary
} from './sharedAssetInstances.js';
import createAssetInstanceSnapshots from './createAssetInstanceSnapshots.js';

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
  return createAssetInstanceSnapshots(definition, state, {
    includeNicheDelta: true,
    maintenanceCostKey: 'upkeepCost',
    includeActionsById: true,
    maintenanceSummary: formatMaintenanceSummary(definition),
    buildMilestone: (assetDefinition, instance) =>
      buildMilestoneProgress(assetDefinition, instance, {
        maxedSummary: 'Maxed out — future milestones queued for future builds.',
        readySummary: 'No requirements — quality milestone is ready to trigger.'
      }),
    progressBuilder: instance => instance.quality?.progress || {},
    sort: (a, b) => b.latestPayout - a.latestPayout,
    decorate: (snapshot, { instance }) => {
      const createdOnDay = Math.max(1, clampNumber(instance.createdOnDay) || 1);
      const currentDay = Math.max(1, clampNumber(state?.day) || 1);
      const daysLive = Math.max(1, currentDay - createdOnDay + 1);

      return {
        ...snapshot,
        createdOnDay,
        daysLive
      };
    }
  });
}

function buildSummary(instances = [], definition) {
  const baseSummary = buildDefaultSummary(instances, {
    fallbackLabel: definition?.singular || definition?.name || 'SaaS app',
    includeNeedsUpkeep: true,
    activeMeta: ({ active }) => `${active} SaaS app${active === 1 ? '' : 's'} live`,
    setupMeta: 'Launch prep underway',
    emptyMeta: 'Launch your first micro SaaS'
  });

  const activeInstances = instances.filter(entry => entry.status?.id === 'active');
  const dailyRevenue = activeInstances.reduce((sum, entry) => sum + entry.latestPayout, 0);
  const upkeepCost = Math.max(0, clampNumber(definition?.maintenance?.cost));
  const dailyUpkeep = baseSummary.active * upkeepCost;
  const netDaily = dailyRevenue - dailyUpkeep;

  const hero = [
    {
      id: 'active',
      label: 'Total SaaS Apps Active',
      value: baseSummary.active,
      note: `${baseSummary.total} deployed`
    },
    {
      id: 'revenue',
      label: 'Daily Revenue',
      value: dailyRevenue,
      note: baseSummary.active > 0 ? 'Yesterday\'s subscriptions' : 'No revenue yet'
    },
    {
      id: 'upkeep',
      label: 'Daily Upkeep',
      value: dailyUpkeep,
      note: baseSummary.active > 0 ? 'Server & support budget' : 'No upkeep'
    },
    {
      id: 'net',
      label: 'Net Daily Flow',
      value: netDaily,
      note: netDaily >= 0 ? 'Cash-positive momentum' : 'Cover upkeep soon'
    }
  ];

  return {
    ...baseSummary,
    dailyRevenue,
    dailyUpkeep,
    netDaily,
    hero
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

function buildServerHubModel(assetDefinitions = [], upgradeDefinitions = [], state = getState()) {
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

  const lock = buildSkillLock(state, 'serverhub');
  if (lock) {
    return {
      definition: null,
      instances: [],
      summary: { meta: lock.meta },
      launch: null,
      upgrades: [],
      pricing: [],
      lock
    };
  }

  const instances = buildInstances(saasDefinition, state);
  const summary = buildSummary(instances, saasDefinition);
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

registerModelBuilder(
  'serverhub',
  (registries = {}, context = {}) =>
    buildServerHubModel(registries.assets ?? [], registries.upgrades ?? [], context.state)
);
