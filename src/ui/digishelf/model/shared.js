import { ensureArray } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { formatMaintenanceSummary } from '../../../game/assets/maintenance.js';
import {
  clampNumber,
  buildMilestoneProgress
} from '../../cards/model/sharedQuality.js';
import {
  buildDefaultSummary,
  createLaunchDescriptor
} from '../../cards/model/sharedAssetInstances.js';
import createAssetInstanceSnapshots from '../../cards/model/createAssetInstanceSnapshots.js';

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

const DEFAULT_MILESTONE_COPY = {
  maxedSummary: 'Maxed out — future milestones queued for upcoming patches.',
  readySummary: 'No requirements — milestone ready when upkeep is funded.'
};

const DEFAULT_ACTION_OPTIONS = {
  lockedReason: 'Requires an upgrade or course first.',
  inactiveCopy: remaining => remaining > 0
    ? `Launch finishes in ${remaining} day${remaining === 1 ? '' : 's'}`
    : 'Launch prep nearly wrapped',
  decorate: ({ action: entry }) => ({
    label: entry.label || 'Quality action'
  })
};

function extractProgress(instance = {}) {
  const quality = instance?.quality || {};
  const progress = quality.progress || {};
  return { ...progress };
}

export function getDigishelfQuickActionIds(assetId) {
  return ensureArray(QUICK_ACTION_MAP[assetId]);
}

export function buildDigishelfInstances(definition, state = getState(), options = {}) {
  if (!definition) {
    return [];
  }

  const maintenanceSummary = options.maintenanceSummary || formatMaintenanceSummary(definition);
  const milestoneCopy = options.milestoneCopy || DEFAULT_MILESTONE_COPY;
  const actionOptions = {
    ...DEFAULT_ACTION_OPTIONS,
    ...(options.actionOptions || {})
  };

  return createAssetInstanceSnapshots(definition, state, {
    maintenanceSummary,
    buildMilestone: (assetDefinition, instance) =>
      buildMilestoneProgress(assetDefinition, instance, milestoneCopy),
    actionOptions,
    quickActionSelector: snapshots =>
      snapshots.find(entry => entry.available) || snapshots[0] || null,
    progressBuilder: extractProgress,
    decorate: snapshot => {
      const { lifetimeSpend, ...rest } = snapshot;
      return {
        ...rest,
        estimatedSpend: lifetimeSpend
      };
    }
  });
}

export function buildDigishelfPlan(definition, { copy = PLAN_COPY[definition?.id] } = {}) {
  if (!definition || !copy) {
    return null;
  }

  const setup = definition?.setup || {};
  const maintenance = definition?.maintenance || {};
  const quality = definition?.quality || {};
  const midLevel = ensureArray(quality.levels).find(level => level.level === 2)
    || ensureArray(quality.levels)[0]
    || null;
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

export function buildDigishelfCollection(definition, state = getState(), options = {}) {
  if (!definition) {
    return {
      definition: null,
      instances: [],
      summary: buildDefaultSummary([], {
        fallbackLabel: 'resource',
        includeNeedsUpkeep: true
      }),
      launch: null,
      plan: null
    };
  }

  const instances = buildDigishelfInstances(definition, state, options.instanceOptions);
  const summary = buildDefaultSummary(instances, {
    fallbackLabel: definition.singular || definition.name || 'resource',
    includeNeedsUpkeep: true
  });
  const launch = createLaunchDescriptor(definition, state, {
    fallbackLabel: `Launch ${definition.singular || definition.name || 'resource'}`
  });
  const plan = buildDigishelfPlan(definition, { copy: options.planCopy });

  return {
    definition,
    instances,
    summary,
    launch,
    plan
  };
}

export function buildDigishelfOverview(ebookSummary, stockSummary, ebookInstances = [], stockInstances = []) {
  const ebookActive = ebookSummary?.active || 0;
  const stockActive = stockSummary?.active || 0;

  const ebookDaily = ensureArray(ebookInstances)
    .filter(entry => entry.status?.id === 'active')
    .reduce((sum, entry) => sum + (entry.latestPayout || 0), 0);
  const stockDaily = ensureArray(stockInstances)
    .filter(entry => entry.status?.id === 'active')
    .reduce((sum, entry) => sum + (entry.latestPayout || 0), 0);

  return {
    ebooksActive: ebookActive,
    stockActive: stockActive,
    totalDaily: ebookDaily + stockDaily,
    ebookDaily,
    stockDaily
  };
}

export function describeDigishelfSummary(overview, { emptyMessage = 'Publish your first resource' } = {}) {
  const ebooksActive = overview?.ebooksActive || 0;
  const stockActive = overview?.stockActive || 0;
  const totalActive = ebooksActive + stockActive;
  const meta = totalActive > 0
    ? `${totalActive} resource${totalActive === 1 ? '' : 's'} live`
    : emptyMessage;
  return { meta, totalActive };
}

export function getDigishelfPlanCopy(assetId) {
  return PLAN_COPY[assetId] || null;
}

export default {
  getDigishelfQuickActionIds,
  buildDigishelfInstances,
  buildDigishelfPlan,
  buildDigishelfCollection,
  buildDigishelfOverview,
  describeDigishelfSummary,
  getDigishelfPlanCopy
};
