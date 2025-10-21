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
import { getAssetEvents, getNicheEvents } from '../../../game/events/index.js';
import { filterUpgradeDefinitions } from '../../cards/model/upgrades.js';

const DEFAULT_MILESTONE_COPY = {
  maxedSummary: 'Maxed out — future milestones queued for future builds.',
  readySummary: 'No requirements — quality milestone is ready to trigger.'
};

function buildMilestoneProgress(definition, instance) {
  return createMilestoneProgress(definition, instance, DEFAULT_MILESTONE_COPY);
}

function normalizePercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return numeric;
}

function normalizeDays(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.max(0, Math.round(numeric));
}

function formatEventSnapshot(event, { source = 'asset' } = {}) {
  if (!event) {
    return null;
  }
  if (event.stat && event.stat !== 'income') {
    return null;
  }
  if (event.modifierType && event.modifierType !== 'percent') {
    return null;
  }

  const percent = normalizePercent(event.currentPercent);
  const remainingDays = normalizeDays(event.remainingDays);
  const totalDays = normalizeDays(event.totalDays);

  return {
    id: event.id || `${source}:${event.templateId || 'event'}`,
    label: event.label || event.templateId || 'Event',
    percent,
    tone: event.tone || 'neutral',
    remainingDays,
    totalDays,
    source
  };
}

function collectInstanceEvents(definition, instance, state) {
  if (!definition || !instance) {
    return [];
  }

  const events = [];
  const assetEvents = getAssetEvents(state, definition.id, instance.id);
  assetEvents.forEach(event => {
    const formatted = formatEventSnapshot(event, { source: 'asset' });
    if (formatted) {
      events.push(formatted);
    }
  });

  if (instance.nicheId) {
    const nicheEvents = getNicheEvents(state, instance.nicheId);
    nicheEvents.forEach(event => {
      const formatted = formatEventSnapshot(event, { source: 'niche' });
      if (formatted) {
        events.push(formatted);
      }
    });
  }

  return events.sort((a, b) => Math.abs(b.percent || 0) - Math.abs(a.percent || 0));
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

function deriveSeoGrade(score) {
  if (!Number.isFinite(Number(score))) {
    return 'F';
  }
  const numeric = Number(score);
  if (numeric >= 90) return 'A';
  if (numeric >= 80) return 'B';
  if (numeric >= 70) return 'C';
  if (numeric >= 60) return 'D';
  return 'F';
}

function normalizeSeoScore(instance) {
  const raw = instance?.metrics?.seoScore;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return 30;
  }
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeBacklinkCount(instance) {
  const raw = instance?.metrics?.backlinks;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.round(numeric));
}

function collectBacklinkThresholds(definition) {
  const levels = ensureArray(definition?.quality?.levels);
  const thresholds = [];
  for (let level = 1; level <= 5; level += 1) {
    const levelDef = levels.find(entry => Number(entry?.level) === level) || {};
    const requirement = Number(levelDef?.requirements?.outreach);
    thresholds.push({
      level,
      requirement: Number.isFinite(requirement) ? Math.max(0, requirement) : 0
    });
  }
  return thresholds;
}

function calculateBacklinkScore({ definition, backlinksCount }) {
  const thresholds = collectBacklinkThresholds(definition);
  let score = 1;
  thresholds.forEach(entry => {
    if (backlinksCount >= entry.requirement) {
      score = Math.max(score, Math.min(5, entry.level));
    }
  });
  return {
    score: Math.min(5, Math.max(1, Math.round(score))),
    thresholds
  };
}

function findNextBacklinkTarget({ thresholds = [], count, currentScore }) {
  const next = thresholds
    .filter(entry => entry.level > currentScore)
    .sort((a, b) => a.level - b.level)
    .find(entry => count < entry.requirement);
  if (!next) {
    return null;
  }
  return Math.max(0, next.requirement);
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
  const events = collectInstanceEvents(definition, instance, state);
  const postsWritten = Math.max(0, Math.round(clampNumber(instance?.quality?.progress?.posts)));
  const seoScore = normalizeSeoScore(instance);
  const seoGrade = deriveSeoGrade(seoScore);
  const backlinksCount = normalizeBacklinkCount(instance);
  const backlinkSummary = calculateBacklinkScore({ definition, backlinksCount });
  const nextBacklinkTarget = findNextBacklinkTarget({
    thresholds: backlinkSummary.thresholds,
    count: backlinksCount,
    currentScore: backlinkSummary.score
  });
  const lifetimeVisits = Math.max(
    0,
    Math.round(Number(instance?.metrics?.lifetimeViews) || 0)
  );
  const currentDailyVisits = Math.max(
    0,
    Math.round(Number(instance?.metrics?.dailyViews) || 0)
  );

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
    events,
    actions: actionSnapshots,
    quickAction,
    niche: formatNiche(nicheInfo),
    nicheLocked: Boolean(instance.nicheId),
    nicheOptions: ensureArray(shared.nicheOptions),
    maintenance: shared.maintenance,
    posts: {
      published: postsWritten
    },
    seo: {
      score: seoScore,
      grade: seoGrade
    },
    backlinks: {
      count: backlinksCount,
      score: backlinkSummary.score,
      nextTarget: nextBacklinkTarget
    },
    visits: {
      lifetime: lifetimeVisits,
      today: currentDailyVisits
    },
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
  return filterUpgradeDefinitions(upgrades, 'blogpress').map(upgrade => ({
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
