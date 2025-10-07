import {
  getRegistry as getRegistryDefinitions,
  getActionDefinition as getActionDefinitionFromService,
  getAssetDefinition as getAssetDefinitionFromService,
  getUpgradeDefinition as getUpgradeDefinitionFromService,
  getMetricDefinition as getMetricDefinitionFromService
} from '../../game/registryService.js';
import { isHustleDefinition } from '../../game/registryShared.js';

let registry = { actions: [], hustles: [], assets: [], upgrades: [] };

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

