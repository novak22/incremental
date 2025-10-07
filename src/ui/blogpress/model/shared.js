import { ensureArray } from '../../../core/helpers.js';
import { getAssetState, getState } from '../../../core/state.js';
import { instanceLabel } from '../../../game/assets/details.js';
import { formatMaintenanceSummary } from '../../../game/assets/maintenance.js';
import { getInstanceNicheInfo } from '../../../game/assets/niches.js';
import { getQualityActions } from '../../../game/assets/quality/actions.js';
import { getInstanceQualityRange, getQualityLevel } from '../../../game/assets/quality/levels.js';
import {
  calculateAveragePayout,
  describeInstanceStatus,
  estimateLifetimeSpend,
  buildPayoutBreakdown,
  mapNicheOptions,
  buildDefaultSummary
} from '../../cards/model/sharedAssetInstances.js';
import {
  clampNumber,
  buildMilestoneProgress as createMilestoneProgress,
  buildActionSnapshot
} from '../../cards/model/sharedQuality.js';

const DEFAULT_MILESTONE_COPY = {
  maxedSummary: 'Maxed out — future milestones queued for future builds.',
  readySummary: 'No requirements — quality milestone is ready to trigger.'
};

function buildMilestoneProgress(definition, instance) {
  return createMilestoneProgress(definition, instance, DEFAULT_MILESTONE_COPY);
}

function formatNiche(nicheInfo) {
  if (!nicheInfo) {
    return null;
  }
  return {
    id: nicheInfo.definition?.id || '',
    name: nicheInfo.definition?.name || nicheInfo.definition?.id || '',
    summary: nicheInfo.popularity?.summary || '',
    label: nicheInfo.popularity?.label || '',
    multiplier: nicheInfo.popularity?.multiplier || 1,
    score: clampNumber(nicheInfo.popularity?.score),
    delta: Number.isFinite(Number(nicheInfo.popularity?.delta))
      ? Number(nicheInfo.popularity.delta)
      : null
  };
}

export function formatBlogpressInstance(definition, instance, index, state, shared = {}) {
  const actions = ensureArray(shared.actions);
  const actionSnapshots = actions.map(action =>
    buildActionSnapshot(definition, instance, action, state)
  );
  const quickAction = actionSnapshots.find(entry => entry.available) || actionSnapshots[0] || null;
  const nicheInfo = getInstanceNicheInfo(instance, state);

  const status = describeInstanceStatus(instance, definition);
  const averagePayout = calculateAveragePayout(instance, state);
  const lifetimeIncome = Math.max(0, clampNumber(instance.totalIncome));
  const estimatedSpend = estimateLifetimeSpend(definition, instance, state);
  const lifetimeNet = lifetimeIncome - estimatedSpend;
  const createdOnDay = Math.max(0, clampNumber(instance?.createdOnDay));
  const currentDay = Math.max(1, clampNumber(state?.day) || 1);
  const daysActive = instance.status === 'active' && createdOnDay > 0
    ? Math.max(1, currentDay - createdOnDay + 1)
    : 0;
  const qualityLevel = Math.max(0, clampNumber(instance?.quality?.level));
  const qualityInfo = getQualityLevel(definition, qualityLevel) || null;
  const qualityRange = getInstanceQualityRange(definition, instance);
  const milestone = buildMilestoneProgress(definition, instance);
  const payoutBreakdown = buildPayoutBreakdown(instance);

  return {
    id: instance.id,
    label: instanceLabel(definition, index),
    status,
    latestPayout: Math.max(0, clampNumber(instance.lastIncome)),
    averagePayout,
    lifetimeIncome,
    estimatedSpend,
    lifetimeNet,
    maintenanceFunded: Boolean(instance.maintenanceFundedToday),
    pendingIncome: Math.max(0, clampNumber(instance.pendingIncome)),
    daysActive,
    qualityLevel,
    qualityInfo,
    qualityRange,
    milestone,
    payoutBreakdown,
    actions: actionSnapshots,
    quickAction,
    niche: formatNiche(nicheInfo),
    nicheLocked: Boolean(instance.nicheId),
    nicheOptions: ensureArray(shared.nicheOptions),
    maintenance: shared.maintenance,
    definition,
    instance
  };
}

export function collectBlogpressQuickActions(definition) {
  return ensureArray(getQualityActions(definition));
}

export function buildBlogpressInstances({
  definition,
  state = getState(),
  assetState = getAssetState('blog', state) || { instances: [] },
  actions = collectBlogpressQuickActions(definition),
  nicheOptions = mapNicheOptions(definition, state),
  maintenance = formatMaintenanceSummary(definition)
} = {}) {
  const instances = ensureArray(assetState.instances).map((instance, index) =>
    formatBlogpressInstance(definition, instance, index, state, {
      actions,
      nicheOptions,
      maintenance
    })
  );

  return {
    instances,
    actions,
    nicheOptions,
    maintenance
  };
}

export function buildBlogpressSummary(instances, options = {}) {
  return buildDefaultSummary(instances, {
    fallbackLabel: 'blog',
    includeNeedsUpkeep: true,
    setupMeta: 'Launch prep in progress',
    ...options
  });
}

export function formatBlogpressModel({ definition, state = getState() } = {}) {
  if (!definition) {
    return {
      summary: {
        total: 0,
        active: 0,
        setup: 0,
        needsUpkeep: 0,
        meta: 'Launch your first blog'
      },
      instances: [],
      nicheOptions: []
    };
  }

  const assetState = getAssetState('blog', state) || { instances: [] };
  const { instances, nicheOptions } = buildBlogpressInstances({
    definition,
    state,
    assetState
  });
  const summary = buildBlogpressSummary(instances);

  return {
    summary,
    instances,
    nicheOptions
  };
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

export function buildBlogpressPricing(definition, upgrades = [], { nicheOptions = [] } = {}) {
  if (!definition) {
    return null;
  }

  const setup = definition?.setup || {};
  const maintenance = formatMaintenanceSummary(definition);
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
  const sortedNicheOptions = ensureArray(nicheOptions)
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  return {
    setup,
    maintenance,
    levels,
    actions,
    upgrades: upgradesList,
    topNiches: sortedNicheOptions.slice(0, 3),
    nicheCount: sortedNicheOptions.length
  };
}

export default {
  formatBlogpressModel,
  buildBlogpressInstances,
  buildBlogpressSummary,
  collectBlogpressQuickActions,
  buildBlogpressPricing
};
