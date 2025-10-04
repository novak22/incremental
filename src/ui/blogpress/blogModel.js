import { ensureArray } from '../../core/helpers.js';
import { getAssetState, getState } from '../../core/state.js';
import { formatMaintenanceSummary } from '../../game/assets/maintenance.js';
import createAssetInstanceSnapshots from '../cards/model/createAssetInstanceSnapshots.js';
import { buildDefaultSummary, mapNicheOptions } from '../cards/model/sharedAssetInstances.js';
import { clampNumber, buildMilestoneProgress } from '../cards/model/sharedQuality.js';

const SUMMARY_OPTIONS = {
  fallbackLabel: 'blog',
  includeNeedsUpkeep: true,
  setupMeta: 'Launch prep in progress'
};

const MILESTONE_COPY = {
  maxedSummary: 'Maxed out — future milestones queued for future builds.',
  readySummary: 'No requirements — quality milestone is ready to trigger.'
};

function resolveAssetState(definition, state, selector) {
  if (typeof selector === 'function') {
    const custom = selector(definition?.id, state);
    if (custom) {
      return custom;
    }
  }
  if (!definition) {
    return { instances: [] };
  }
  const assetState = getAssetState(definition.id, state);
  if (assetState && typeof assetState === 'object') {
    return assetState;
  }
  return { instances: [] };
}

export function summarizeBlogpressInstances(instances = []) {
  return buildDefaultSummary(ensureArray(instances), SUMMARY_OPTIONS);
}

function decorateInstanceSnapshot(snapshot, instance, state) {
  const createdOnDay = Math.max(0, clampNumber(instance?.createdOnDay));
  const currentDay = Math.max(1, clampNumber(state?.day) || 1);
  const daysActive = instance.status === 'active' && createdOnDay > 0
    ? Math.max(1, currentDay - createdOnDay + 1)
    : 0;
  const estimatedSpend = Math.max(0, clampNumber(snapshot.lifetimeSpend));
  const lifetimeIncome = Math.max(0, clampNumber(snapshot.lifetimeIncome));
  return {
    ...snapshot,
    daysActive,
    estimatedSpend,
    lifetimeNet: lifetimeIncome - estimatedSpend,
    payoutBreakdown: snapshot.payoutBreakdown || { entries: [], total: 0 }
  };
}

function buildActionMetadata(instances = []) {
  return ensureArray(instances).map(instance => ({
    id: instance.id,
    quickAction: instance.quickAction || null,
    actions: ensureArray(instance.actions)
  }));
}

export function formatBlogpressModel(definition, state = getState(), options = {}) {
  const mapNiches = typeof options.mapNiches === 'function' ? options.mapNiches : mapNicheOptions;
  if (!definition) {
    return {
      definition: null,
      instances: [],
      summary: summarizeBlogpressInstances([]),
      nicheOptions: [],
      actionMetadata: []
    };
  }

  const assetState = resolveAssetState(definition, state, options.selectAssetState);
  const nicheOptions = mapNiches(definition, state);
  const maintenanceSummary = formatMaintenanceSummary(definition);

  const snapshots = createAssetInstanceSnapshots(definition, state, {
    selectAssetState: () => assetState,
    maintenanceSummary,
    getNicheOptions: () => nicheOptions,
    buildMilestone: (def, instance, ctxState) =>
      buildMilestoneProgress(def, instance, MILESTONE_COPY),
    quickActionSelector: actions => actions.find(entry => entry.available) || actions[0] || null,
    decorate: (snapshot, { instance, state: snapshotState }) =>
      decorateInstanceSnapshot(snapshot, instance, snapshotState)
  });

  const summary = summarizeBlogpressInstances(snapshots);
  const actionMetadata = buildActionMetadata(snapshots);

  return {
    definition,
    instances: snapshots,
    summary,
    nicheOptions,
    actionMetadata
  };
}

export default formatBlogpressModel;
