import {
  getAssetDefinition as getCoreAssetDefinition,
  getUpgradeDefinition as getCoreUpgradeDefinition,
  getActionDefinition as getCoreActionDefinition,
  getMetricDefinition as getCoreMetricDefinition
} from '../../core/state/registry.js';

/**
 * Returns an asset definition from the central registry.
 * @param {string} assetId
 * @returns {object|null}
 */
export function selectAssetDefinition(assetId) {
  if (!assetId) return null;
  return getCoreAssetDefinition(assetId);
}

/**
 * Returns an upgrade definition from the registry.
 * @param {string} upgradeId
 * @returns {object|null}
 */
export function selectUpgradeDefinition(upgradeId) {
  if (!upgradeId) return null;
  return getCoreUpgradeDefinition(upgradeId);
}

/**
 * Returns an action definition by id.
 * @param {string} actionId
 * @returns {object|null}
 */
export function selectActionDefinition(actionId) {
  if (!actionId) return null;
  return getCoreActionDefinition(actionId);
}

/**
 * Returns a metric definition by id.
 * @param {string} metricId
 * @returns {object|null}
 */
export function selectMetricDefinition(metricId) {
  if (!metricId) return null;
  return getCoreMetricDefinition(metricId);
}
