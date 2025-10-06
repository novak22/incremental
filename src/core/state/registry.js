import {
  getRegistry as getRegistryDefinitions,
  getActionDefinition as getActionDefinitionFromService,
  getAssetDefinition as getAssetDefinitionFromService,
  getUpgradeDefinition as getUpgradeDefinitionFromService,
  getMetricDefinition as getMetricDefinitionFromService
} from '../../game/registryService.js';

let registry = { actions: [], hustles: [], assets: [], upgrades: [] };

function isHustleDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    return false;
  }
  const category = typeof definition.category === 'string'
    ? definition.category.trim().toLowerCase()
    : null;
  if (category === 'hustle') {
    return true;
  }
  const templateKind = typeof definition.templateKind === 'string'
    ? definition.templateKind.trim().toLowerCase()
    : null;
  if (templateKind === 'hustle') {
    return true;
  }
  const type = typeof definition.type === 'string'
    ? definition.type.trim().toLowerCase()
    : null;
  if (type === 'hustle') {
    return true;
  }
  if (definition.market) {
    return true;
  }
  const tagType = typeof definition.tag?.type === 'string'
    ? definition.tag.type.trim().toLowerCase()
    : null;
  return tagType === 'instant';
}

function deriveHustles(actions = [], fallback = []) {
  if (!Array.isArray(actions) || !actions.length) {
    return Array.isArray(fallback) ? fallback : [];
  }
  const hustles = actions.filter(isHustleDefinition);
  if (hustles.length) {
    return hustles;
  }
  return Array.isArray(fallback) ? fallback : [];
}

export function configureRegistry() {
  const snapshot = getRegistryDefinitions();
  const actions = Array.isArray(snapshot.actions) ? snapshot.actions : [];
  if (!Array.isArray(snapshot.hustles) || snapshot.hustles.length === 0) {
    snapshot.hustles = deriveHustles(actions, snapshot.hustles);
  }
  registry = snapshot;
}

export function getRegistrySnapshot() {
  return registry;
}

export function getActionDefinition(id) {
  return getActionDefinitionFromService(id);
}

export function getHustleDefinition(id) {
  return getActionDefinitionFromService(id);
}

export function getAssetDefinition(id) {
  return getAssetDefinitionFromService(id);
}

export function getUpgradeDefinition(id) {
  return getUpgradeDefinitionFromService(id);
}

export function getMetricDefinition(metricId) {
  return getMetricDefinitionFromService(metricId);
}

