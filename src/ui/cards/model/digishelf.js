import { ensureArray } from '../../../core/helpers.js';
import { getState } from '../../../core/state.js';
import { assignInstanceToNiche } from '../../../game/assets/niches.js';
import { registerModelBuilder } from '../modelBuilderRegistry.js';
import { buildSkillLock } from './skillLocks.js';
import { filterUpgradeDefinitions, getUpgradeSnapshot, describeUpgradeStatus } from './upgrades.js';
import {
  getDigishelfQuickActionIds,
  buildDigishelfCollection,
  buildDigishelfOverview,
  describeDigishelfSummary,
  getDigishelfPlanCopy,
  collectDigishelfUpgradeDetails
} from '../../digishelf/model/shared.js';

function clampNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function resolveUpgradeAction(definition) {
  if (!definition?.action) {
    return null;
  }
  const { action } = definition;
  const label = typeof action.label === 'function'
    ? action.label()
    : action.label || 'Purchase upgrade';
  const disabled = typeof action.disabled === 'function'
    ? Boolean(action.disabled())
    : Boolean(action.disabled);
  const onClick = typeof action.onClick === 'function'
    ? () => action.onClick()
    : null;
  return {
    label,
    disabled,
    onClick
  };
}

function buildDigishelfUpgrades(upgradeDefinitions = [], state) {
  return filterUpgradeDefinitions(upgradeDefinitions, 'digishelf').map(definition => {
    const snapshot = getUpgradeSnapshot(definition, state);
    const action = resolveUpgradeAction(definition);
    return {
      id: definition.id,
      name: definition.name,
      cost: Math.max(0, clampNumber(definition.cost)),
      description: definition.boosts || definition.description || '',
      tag: definition.tag || null,
      affects: definition.affects || {},
      effects: definition.effects || {},
      action,
      definition,
      boosts: definition.boosts || '',
      details: collectDigishelfUpgradeDetails(definition),
      snapshot,
      status: describeUpgradeStatus(snapshot)
    };
  });
}

function buildDigishelfModel(assetDefinitions = [], upgradeDefinitions = [], state = getState()) {
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
      lock,
      upgrades: []
    };
  }

  const ebook = buildDigishelfCollection(ebookDefinition, state, {
    planCopy: getDigishelfPlanCopy('ebook')
  });
  const stock = buildDigishelfCollection(stockDefinition, state, {
    planCopy: getDigishelfPlanCopy('stockPhotos')
  });
  const overview = buildDigishelfOverview(ebook.summary, stock.summary, ebook.instances, stock.instances);
  const { meta: summaryMeta, totalActive } = describeDigishelfSummary(overview);
  const pricing = [ebook.plan, stock.plan].filter(Boolean);
  const upgrades = buildDigishelfUpgrades(upgradeDefinitions, state);

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
    },
    upgrades
  };
}

export function getQuickActionIds(assetId) {
  return getDigishelfQuickActionIds(assetId);
}

export function selectDigishelfNiche(assetId, instanceId, nicheId) {
  return assignInstanceToNiche(assetId, instanceId, nicheId);
}

registerModelBuilder('digishelf', (registries = {}, context = {}) =>
  buildDigishelfModel(registries.assets ?? [], registries.upgrades ?? [], context.state)
);
