import {
  getRegistry as getRegistryDefinitions,
  getActionDefinition as getActionDefinitionFromService,
  getAssetDefinition as getAssetDefinitionFromService,
  getUpgradeDefinition as getUpgradeDefinitionFromService,
  getMetricDefinition as getMetricDefinitionFromService
} from '../../game/registryService.js';

let registry = { actions: [], hustles: [], assets: [], upgrades: [] };

export function configureRegistry() {
  registry = getRegistryDefinitions();
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

