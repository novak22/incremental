import { ensureArray } from '../../../core/helpers.js';
import { getAssetState, getState } from '../../../core/state.js';
import { instanceLabel } from '../../../game/assets/details.js';
import { formatMaintenanceSummary } from '../../../game/assets/maintenance.js';
import {
  assignInstanceToNiche,
  getAssignableNicheSummaries,
  getInstanceNicheInfo
} from '../../../game/assets/niches.js';
import {
  getInstanceQualityRange,
  getQualityActions,
  getQualityLevel
} from '../../../game/assets/quality.js';
import { describeAssetLaunchAvailability } from './assets.js';
import { registerModelBuilder } from '../modelBuilderRegistry.js';
import { buildSkillLock } from './skillLocks.js';
import {
  clampNumber,
  buildActionSnapshot,
  buildMilestoneProgress
} from './sharedQuality.js';

const QUICK_ACTION_MAP = {
  ebook: ['writeChapter'],
  stockPhotos: ['planShoot', 'batchEdit']
};

const PLAN_COPY = {
  ebook: {
    title: 'Starter Plan',
    summary: 'Serialise your universe one polished volume at a time and layer in evergreen royalties.',
    cta: 'Author New Series'
  },
  stockPhotos: {
    title: 'Pro Plan',
    summary: 'Stage dazzling shoots, upload polished batches, and syndicate assets across every marketplace.',
    cta: 'Open Gallery'
  }
};

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

function extractProgress(instance = {}) {
  const quality = instance?.quality || {};
  const progress = quality.progress || {};
  return {
    ...progress
  };
}

function buildInstances(definition, state) {
  const assetState = getAssetState(definition.id, state) || { instances: [] };
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
    const milestone = buildMilestoneProgress(definition, instance, {
      maxedSummary: 'Maxed out — future milestones queued for upcoming patches.',
      readySummary: 'No requirements — milestone ready when upkeep is funded.'
    });
    const qualityRange = getInstanceQualityRange(definition, instance);
    const payoutBreakdown = buildPayoutBreakdown(instance);
    const actionSnapshots = actions.map(action => buildActionSnapshot(definition, instance, action, state, {
      lockedReason: 'Requires an upgrade or course first.',
      inactiveCopy: remaining => remaining > 0
        ? `Launch finishes in ${remaining} day${remaining === 1 ? '' : 's'}`
        : 'Launch prep nearly wrapped',
      decorate: ({ action: entry }) => ({
        label: entry.label || 'Quality action'
      })
    }));
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

    const estimatedSpend = estimateLifetimeSpend(definition, instance, state);
    const lifetimeIncome = Math.max(0, clampNumber(instance.totalIncome));
    const profit = lifetimeIncome - estimatedSpend;
    const roi = estimatedSpend > 0 ? profit / estimatedSpend : null;

    return {
      id: instance.id,
      label,
      status,
      latestPayout: Math.max(0, clampNumber(instance.lastIncome)),
      averagePayout,
      lifetimeIncome,
      estimatedSpend,
      profit,
      roi,
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
      instance,
      progress: extractProgress(instance)
    };
  });
}

function buildSummary(instances = [], fallbackLabel = 'resource') {
  const total = instances.length;
  const active = instances.filter(entry => entry.status?.id === 'active').length;
  const setup = total - active;
  const needsUpkeep = instances.filter(entry => !entry.maintenanceFunded && entry.status?.id === 'active').length;
  let meta = '';
  if (active > 0) {
    meta = `${active} ${fallbackLabel}${active === 1 ? '' : 's'} live`;
  } else if (setup > 0) {
    meta = 'Launch prep underway';
  } else {
    meta = `Launch your first ${fallbackLabel}`;
  }
  return { total, active, setup, needsUpkeep, meta };
}

function buildLaunch(definition, state) {
  const availability = describeAssetLaunchAvailability(definition, state);
  const launchAction = definition.action || null;
  if (!launchAction) {
    return {
      label: `Launch ${definition.singular || definition.name || 'resource'}`,
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

function buildPlan(definition, state, copy) {
  const setup = definition?.setup || {};
  const maintenance = definition?.maintenance || {};
  const quality = definition?.quality || {};
  const midLevel = ensureArray(quality.levels).find(level => level.level === 2) || ensureArray(quality.levels)[0] || null;
  const income = midLevel?.income || {};
  const averageIncome = (Math.max(0, clampNumber(income.min)) + Math.max(0, clampNumber(income.max))) / 2;

  return {
    id: definition.id,
    title: copy.title,
    subtitle: definition.name || definition.id,
    summary: copy.summary,
    cta: copy.cta,
    setup: {
      cost: Math.max(0, clampNumber(setup.cost)),
      days: Math.max(0, clampNumber(setup.days)),
      hoursPerDay: Math.max(0, clampNumber(setup.hoursPerDay))
    },
    upkeep: {
      hours: Math.max(0, clampNumber(maintenance.hours)),
      cost: Math.max(0, clampNumber(maintenance.cost))
    },
    averageDaily: averageIncome,
    education: ensureArray(definition.requirements?.knowledge),
    equipment: ensureArray(definition.requirements?.equipment)
  };
}

function buildModelForDefinition(definition, state, copy) {
  if (!definition) {
    return {
      definition: null,
      instances: [],
      summary: buildSummary([], 'resource'),
      launch: null,
      plan: null
    };
  }

  const instances = buildInstances(definition, state);
  const summary = buildSummary(instances, definition.singular || definition.name || 'resource');
  const launch = buildLaunch(definition, state);
  const plan = buildPlan(definition, state, copy);

  return {
    definition,
    instances,
    summary,
    launch,
    plan
  };
}

function buildOverview(ebookSummary, stockSummary, ebookInstances = [], stockInstances = []) {
  const ebookDaily = ebookInstances
    .filter(entry => entry.status?.id === 'active')
    .reduce((sum, entry) => sum + entry.latestPayout, 0);
  const stockDaily = stockInstances
    .filter(entry => entry.status?.id === 'active')
    .reduce((sum, entry) => sum + entry.latestPayout, 0);

  return {
    ebooksActive: ebookSummary.active,
    stockActive: stockSummary.active,
    totalDaily: ebookDaily + stockDaily,
    ebookDaily,
    stockDaily
  };
}

function buildDigishelfModel(assetDefinitions = [], state = getState()) {
  const definitionMap = new Map(ensureArray(assetDefinitions).map(definition => [definition?.id, definition]));
  const ebookDefinition = definitionMap.get('ebook') || null;
  const stockDefinition = definitionMap.get('stockPhotos') || null;

  const lock = buildSkillLock(state, 'digishelf');
  if (lock) {
    const meta = lock.meta;
    const buildLocked = () => ({
      definition: null,
      instances: [],
      summary: { total: 0, active: 0, setup: 0, needsUpkeep: 0, meta },
      launch: null,
      plan: null
    });
    return {
      ebook: buildLocked(),
      stock: buildLocked(),
      overview: {
        ebooksActive: 0,
        stockActive: 0,
        totalDaily: 0,
        ebookDaily: 0,
        stockDaily: 0,
        meta
      },
      pricing: [],
      summary: { meta, totalActive: 0 },
      lock
    };
  }

  const ebook = buildModelForDefinition(ebookDefinition, state, PLAN_COPY.ebook);
  const stock = buildModelForDefinition(stockDefinition, state, PLAN_COPY.stockPhotos);
  const overview = buildOverview(ebook.summary, stock.summary, ebook.instances, stock.instances);

  const totalActive = overview.ebooksActive + overview.stockActive;
  const summaryMeta = totalActive > 0
    ? `${totalActive} resource${totalActive === 1 ? '' : 's'} live`
    : 'Publish your first resource';

  const pricing = [ebook.plan, stock.plan].filter(Boolean);

  return {
    ebook,
    stock,
    overview: {
      ...overview,
      meta: summaryMeta
    },
    pricing,
    summary: {
      meta: summaryMeta,
      totalActive
    }
  };
}

export function getQuickActionIds(assetId) {
  return QUICK_ACTION_MAP[assetId] || [];
}

export function selectDigishelfNiche(assetId, instanceId, nicheId) {
  return assignInstanceToNiche(assetId, instanceId, nicheId);
}

registerModelBuilder('digishelf', (registries = {}, context = {}) =>
  buildDigishelfModel(registries.assets ?? [], context.state)
);

