import { ensureArray } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { assignInstanceToNiche } from '../../../game/assets/niches.js';
import { describeAssetLaunchAvailability } from './assets.js';
import { registerModelBuilder } from '../modelBuilderRegistry.js';
import { buildSkillLock } from './skillLocks.js';
import formatBlogpressModel, { summarizeBlogpressInstances } from '../../blogpress/blogModel.js';
import { clampNumber } from './sharedQuality.js';

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

function buildPricing(definition, upgrades = [], state, { nicheOptions = [] } = {}) {
  const setup = definition?.setup || {};
  const maintenance = definition?.maintenance || {};
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
  const sortedNiches = ensureArray(nicheOptions)
    .slice()
    .sort((a, b) => (b?.score || 0) - (a?.score || 0));

  return {
    setup,
    maintenance,
    levels,
    actions,
    upgrades: upgradesList,
    topNiches: sortedNiches.slice(0, 3),
    nicheCount: sortedNiches.length
  };
}

function buildLaunchAction(definition, state) {
  const availability = describeAssetLaunchAvailability(definition, state);
  const launchAction = definition?.action || null;
  if (!launchAction) {
    return {
      label: 'Launch Blog',
      disabled: availability.disabled,
      onClick: null,
      availability
    };
  }

  const resolveActionLabel = value =>
    typeof value === 'function' ? value(state) : value;

  return {
    label: resolveActionLabel(launchAction.label),
    disabled: typeof launchAction.disabled === 'function'
      ? launchAction.disabled(state)
      : Boolean(launchAction.disabled),
    onClick: launchAction.onClick || null,
    availability
  };
}

function buildEmptySummary(meta) {
  const summary = summarizeBlogpressInstances([]);
  return { ...summary, meta };
}

function buildBlogpressModel(assetDefinitions = [], upgradeDefinitions = [], state = getState()) {
  const definition = ensureArray(assetDefinitions).find(entry => entry?.id === 'blog') || null;
  if (!definition) {
    return {
      definition: null,
      instances: [],
      summary: buildEmptySummary('BlogPress locked'),
      pricing: null,
      launch: null
    };
  }

  const lock = buildSkillLock(state, 'blogpress');
  if (lock) {
    return {
      definition: null,
      instances: [],
      summary: buildEmptySummary(lock.meta),
      pricing: null,
      launch: null,
      lock
    };
  }

  const { instances, summary, nicheOptions, actionMetadata } = formatBlogpressModel(definition, state);
  const pricing = buildPricing(definition, upgradeDefinitions, state, { nicheOptions });
  const launch = buildLaunchAction(definition, state);

  return {
    definition,
    instances,
    summary,
    pricing,
    launch,
    actionMetadata
  };
}

export function selectNiche(assetId, instanceId, nicheId) {
  return assignInstanceToNiche(assetId, instanceId, nicheId);
}

registerModelBuilder(
  'blogpress',
  (registries = {}, context = {}) =>
    buildBlogpressModel(registries.assets ?? [], registries.upgrades ?? [], context.state)
);
