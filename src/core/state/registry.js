import {
  getRegistry as getRegistryDefinitions,
  getHustleDefinition as getHustleDefinitionFromService,
  getAssetDefinition as getAssetDefinitionFromService,
  getUpgradeDefinition as getUpgradeDefinitionFromService,
  getMetricDefinition as getMetricDefinitionFromService
} from '../../game/registryService.js';

let registry = { hustles: [], assets: [], upgrades: [] };

export function configureRegistry() {
  registry = getRegistryDefinitions();
}

export function getRegistrySnapshot() {
  return registry;
}

export function getHustleDefinition(id) {
  return getHustleDefinitionFromService(id);
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

export default {
  configureRegistry,
  getRegistrySnapshot,
  getHustleDefinition,
  getAssetDefinition,
  getUpgradeDefinition,
  getMetricDefinition
};
