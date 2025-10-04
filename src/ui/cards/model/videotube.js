import { ensureArray, formatMoney } from '../../../core/helpers.js';
import { getAssetState, getState } from '../../../core/state.js';
import { instanceLabel } from '../../../game/assets/details.js';
import { formatMaintenanceSummary } from '../../../game/assets/maintenance.js';
import {
  assignInstanceToNiche,
  getInstanceNicheInfo
} from '../../../game/assets/niches.js';
import { getQualityActions } from '../../../game/assets/quality/actions.js';
import { getInstanceQualityRange, getQualityLevel } from '../../../game/assets/quality/levels.js';
import { setAssetInstanceName } from '../../../game/assets/actions.js';
import { describeAssetLaunchAvailability } from './assets.js';
import { registerModelBuilder } from '../modelBuilderRegistry.js';
import { buildSkillLock } from './skillLocks.js';
import {
  clampNumber,
  buildActionSnapshot,
  buildMilestoneProgress
} from './sharedQuality.js';
import {
  calculateAveragePayout,
  describeInstanceStatus,
  estimateLifetimeSpend,
  buildPayoutBreakdown,
  mapNicheOptions,
  buildDefaultSummary
} from './sharedAssetInstances.js';

function formatCurrency(amount) {
  return `$${formatMoney(Math.max(0, Math.round(Number(amount) || 0)))}`;
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
  const nicheOptions = mapNicheOptions(definition, state, { includeDelta: true });

  return instances.map((instance, index) => {
    const fallbackLabel = instanceLabel(definition, index);
    const customName = typeof instance.customName === 'string' && instance.customName.trim()
      ? instance.customName.trim()
      : '';
    const label = customName || fallbackLabel;
    const status = describeInstanceStatus(instance, definition);
    const averagePayout = calculateAveragePayout(instance, state);
    const qualityLevel = Math.max(0, clampNumber(instance?.quality?.level));
    const qualityInfo = getQualityLevel(definition, qualityLevel);
    const milestone = buildMilestoneProgress(definition, instance, {
      maxedSummary: 'Maxed out — production is at peak polish.',
      readySummary: 'No requirements — milestone ready to fire.'
    });
    const qualityRange = getInstanceQualityRange(definition, instance);
    const payoutBreakdown = buildPayoutBreakdown(instance);
    const actionSnapshots = actions.map(action => buildActionSnapshot(definition, instance, action, state, {
      limitReason: 'Daily limit hit — try again tomorrow.',
      inactiveCopy: remaining => remaining > 0
        ? `Launch wraps in ${remaining} day${remaining === 1 ? '' : 's'}`
        : 'Launch finishing up soon',
      decorate: ({ action: entry, instance: assetInstance, definition: assetDefinition, tracks }) => {
        const track = entry.progressKey ? tracks?.[entry.progressKey] : null;
        const rawAmount = typeof entry.progressAmount === 'function'
          ? entry.progressAmount({ definition: assetDefinition, instance: assetInstance })
          : Number(entry.progressAmount);
        const effectAmount = Number.isFinite(rawAmount) && rawAmount !== 0 ? rawAmount : 1;
        const effect = track
          ? `+${effectAmount} ${track.shortLabel || track.label}`
          : 'Boosts quality momentum';

        return {
          description: entry.description || '',
          effect
        };
      }
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
  const summary = buildDefaultSummary(instances, {
    fallbackLabel: definition?.singular || 'video'
  });
  const stats = buildStats(instances);
  const analytics = buildAnalytics(instances);
  const availability = describeAssetLaunchAvailability(definition, state);
  const launchAction = definition.action || null;
  const defaultName = `Video #${instances.length + 1}`;
  const nicheOptions = mapNicheOptions(definition, state, { includeDelta: true });

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
