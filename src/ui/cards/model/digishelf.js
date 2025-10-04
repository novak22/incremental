import { ensureArray } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { formatMaintenanceSummary } from '../../../game/assets/maintenance.js';
import {
  assignInstanceToNiche
} from '../../../game/assets/niches.js';
import { registerModelBuilder } from '../modelBuilderRegistry.js';
import { buildSkillLock } from './skillLocks.js';
import {
  clampNumber,
  buildMilestoneProgress
} from './sharedQuality.js';
import {
  buildDefaultSummary,
  createLaunchDescriptor
} from './sharedAssetInstances.js';
import createAssetInstanceSnapshots from './createAssetInstanceSnapshots.js';

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

function extractProgress(instance = {}) {
  const quality = instance?.quality || {};
  const progress = quality.progress || {};
  return {
    ...progress
  };
}

function buildInstances(definition, state) {
  const maintenance = formatMaintenanceSummary(definition);

  return createAssetInstanceSnapshots(definition, state, {
    maintenanceSummary: maintenance,
    buildMilestone: (assetDefinition, instance) =>
      buildMilestoneProgress(assetDefinition, instance, {
        maxedSummary: 'Maxed out — future milestones queued for upcoming patches.',
        readySummary: 'No requirements — milestone ready when upkeep is funded.'
      }),
    actionOptions: {
      lockedReason: 'Requires an upgrade or course first.',
      inactiveCopy: remaining => remaining > 0
        ? `Launch finishes in ${remaining} day${remaining === 1 ? '' : 's'}`
        : 'Launch prep nearly wrapped',
      decorate: ({ action: entry }) => ({
        label: entry.label || 'Quality action'
      })
    },
    quickActionSelector: actionSnapshots =>
      actionSnapshots.find(entry => entry.available) || actionSnapshots[0] || null,
    progressBuilder: instance => extractProgress(instance),
    decorate: snapshot => {
      const { lifetimeSpend, ...rest } = snapshot;
      return {
        ...rest,
        estimatedSpend: lifetimeSpend
      };
    }
  });
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
      summary: buildDefaultSummary([], { fallbackLabel: 'resource', includeNeedsUpkeep: true }),
      launch: null,
      plan: null
    };
  }

  const instances = buildInstances(definition, state);
  const summary = buildDefaultSummary(instances, {
    fallbackLabel: definition.singular || definition.name || 'resource',
    includeNeedsUpkeep: true
  });
  const launch = createLaunchDescriptor(definition, state, {
    fallbackLabel: `Launch ${definition.singular || definition.name || 'resource'}`
  });
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

