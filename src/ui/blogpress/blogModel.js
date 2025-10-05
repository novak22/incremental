import { ensureArray } from '../../core/helpers.js';
import { getAssetState, getState } from '../../core/state.js';
import { instanceLabel } from '../../game/assets/details.js';
import { formatMaintenanceSummary } from '../../game/assets/maintenance.js';
import { getInstanceNicheInfo } from '../../game/assets/niches.js';
import { getQualityActions } from '../../game/assets/quality/actions.js';
import {
  getInstanceQualityRange,
  getQualityLevel
} from '../../game/assets/quality/levels.js';
import {
  calculateAveragePayout,
  describeInstanceStatus,
  estimateLifetimeSpend,
  buildPayoutBreakdown,
  mapNicheOptions,
  buildDefaultSummary
} from '../cards/model/sharedAssetInstances.js';
import {
  clampNumber,
  buildMilestoneProgress as createMilestoneProgress,
  buildActionSnapshot
} from '../cards/model/sharedQuality.js';

function buildMilestoneProgress(definition, instance) {
  return createMilestoneProgress(definition, instance, {
    maxedSummary: 'Maxed out — future milestones queued for future builds.',
    readySummary: 'No requirements — quality milestone is ready to trigger.'
  });
}

function formatInstance(definition, instance, index, state, shared) {
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
  const qualityInfo = getQualityLevel(definition, qualityLevel);
  const milestone = buildMilestoneProgress(definition, instance);
  const qualityRange = getInstanceQualityRange(definition, instance);
  const payoutBreakdown = buildPayoutBreakdown(instance);
  const actionSnapshots = shared.actions.map(action =>
    buildActionSnapshot(definition, instance, action, state)
  );
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
    qualityInfo: qualityInfo || null,
    qualityRange,
    milestone,
    payoutBreakdown,
    actions: actionSnapshots,
    quickAction,
    niche,
    nicheLocked: Boolean(instance.nicheId),
    nicheOptions: shared.nicheOptions,
    maintenance: shared.maintenance,
    definition,
    instance
  };
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
  const instances = ensureArray(assetState.instances);
  const actions = ensureArray(getQualityActions(definition));
  const nicheOptions = mapNicheOptions(definition, state);
  const maintenance = formatMaintenanceSummary(definition);

  const formattedInstances = instances.map((instance, index) =>
    formatInstance(definition, instance, index, state, {
      actions,
      nicheOptions,
      maintenance
    })
  );

  const summary = buildDefaultSummary(formattedInstances, {
    fallbackLabel: 'blog',
    includeNeedsUpkeep: true,
    setupMeta: 'Launch prep in progress'
  });

  return {
    summary,
    instances: formattedInstances,
    nicheOptions
  };
}

export default {
  formatBlogpressModel
};
