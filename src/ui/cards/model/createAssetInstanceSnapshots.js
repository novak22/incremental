import { ensureArray } from '../../../core/helpers.js';
import { getAssetState } from '../../../core/state.js';
import { instanceLabel } from '../../../game/assets/details.js';
import { formatMaintenanceSummary } from '../../../game/assets/maintenance.js';
import { getInstanceNicheInfo } from '../../../game/assets/niches.js';
import { getInstanceQualityRange, getQualityActions, getQualityLevel } from '../../../game/assets/quality.js';
import {
  clampNumber,
  buildActionSnapshot as buildSharedActionSnapshot
} from './sharedQuality.js';
import {
  calculateAveragePayout,
  describeInstanceStatus,
  estimateLifetimeSpend,
  buildPayoutBreakdown,
  mapNicheOptions
} from './sharedAssetInstances.js';

function defaultGetActions(definition) {
  return getQualityActions(definition);
}

function defaultLabelBuilder(definition, _instance, index) {
  return instanceLabel(definition, index);
}

export default function createAssetInstanceSnapshots(definition, state, options = {}) {
  if (!definition) {
    return [];
  }

  const {
    selectAssetState,
    getActions = defaultGetActions,
    buildActionSnapshot: customActionBuilder,
    actionOptions,
    describeStatus = describeInstanceStatus,
    statusOptions,
    calculateAverage = calculateAveragePayout,
    buildMilestone,
    buildPayoutBreakdown: customPayoutBuilder,
    payoutOptions,
    includeNicheDelta = false,
    labelBuilder = defaultLabelBuilder,
    maintenanceSummary = formatMaintenanceSummary(definition),
    includeActionsById = false,
    quickActionSelector,
    progressBuilder,
    lifetimeSpendCalculator = estimateLifetimeSpend,
    maintenanceCostKey,
    decorate,
    sort
  } = options;

  const assetState = typeof selectAssetState === 'function'
    ? selectAssetState(definition, state)
    : getAssetState(definition.id, state);
  const instances = ensureArray(assetState?.instances);
  const actions = ensureArray(getActions(definition, state));
  const nicheOptions = typeof options.getNicheOptions === 'function'
    ? options.getNicheOptions(definition, state, { includeNicheDelta })
    : mapNicheOptions(definition, state, { includeDelta: includeNicheDelta });

  const buildActionSnapshot = typeof customActionBuilder === 'function'
    ? customActionBuilder
    : (def, inst, action, ctxState) =>
        buildSharedActionSnapshot(def, inst, action, ctxState, actionOptions);

  const getPayoutBreakdown = typeof customPayoutBuilder === 'function'
    ? customPayoutBuilder
    : (inst) => buildPayoutBreakdown(inst, payoutOptions);

  const snapshots = instances.map((instance, index) => {
    const label = labelBuilder(definition, instance, index);
    const status = describeStatus(instance, definition, statusOptions);
    const averagePayout = calculateAverage(instance, state);
    const qualityLevel = Math.max(0, clampNumber(instance?.quality?.level));
    const qualityInfo = getQualityLevel(definition, qualityLevel) || null;
    const milestone = typeof buildMilestone === 'function'
      ? buildMilestone(definition, instance, state)
      : null;
    const qualityRange = getInstanceQualityRange(definition, instance);
    const payoutBreakdownSnapshot = getPayoutBreakdown(instance, definition, state);
    const actionSnapshots = actions
      .map(action => buildActionSnapshot(definition, instance, action, state))
      .filter(Boolean);
    const quickAction = typeof quickActionSelector === 'function'
      ? quickActionSelector(actionSnapshots, { instance, definition, state })
      : undefined;
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
    const rawLifetimeSpend = lifetimeSpendCalculator(definition, instance, state);
    const lifetimeSpend = Math.max(0, clampNumber(rawLifetimeSpend));
    const profit = lifetimeIncome - lifetimeSpend;
    const roi = lifetimeSpend > 0 ? profit / lifetimeSpend : null;

    const snapshot = {
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
      pendingIncome: Math.max(0, clampNumber(instance.pendingIncome)),
      qualityLevel,
      qualityInfo,
      qualityRange,
      milestone,
      payoutBreakdown: payoutBreakdownSnapshot,
      actions: actionSnapshots,
      niche,
      nicheLocked: Boolean(instance.nicheId),
      nicheOptions,
      maintenance: maintenanceSummary,
      definition,
      instance
    };

    if (maintenanceCostKey) {
      snapshot[maintenanceCostKey] = Math.max(0, clampNumber(definition?.maintenance?.cost));
    }

    if (typeof progressBuilder === 'function') {
      const progress = progressBuilder(instance, definition, state);
      if (progress !== undefined) {
        snapshot.progress = progress;
      }
    }

    if (includeActionsById) {
      snapshot.actionsById = actionSnapshots.reduce((map, action) => {
        if (action?.id) {
          map[action.id] = action;
        }
        return map;
      }, {});
    }

    if (quickAction !== undefined) {
      snapshot.quickAction = quickAction;
    }

    if (typeof decorate === 'function') {
      const decorated = decorate(snapshot, { instance, definition, state, index });
      return decorated || snapshot;
    }

    return snapshot;
  });

  if (typeof sort === 'function') {
    snapshots.sort(sort);
  }

  return snapshots;
}
