import {
  getState as getCoreState,
  getAssetState as getCoreAssetState,
  getUpgradeState as getCoreUpgradeState,
  countActiveAssetInstances as countActiveAssetInstancesCore
} from '../../core/state.js';

function cloneInstances(instances) {
  if (!Array.isArray(instances)) {
    return [];
  }
  return instances.map(entry => ({ ...entry }));
}

/**
 * Returns the live game state snapshot consumed by UI presenters.
 * @returns {object|null}
 */
export function selectGameState() {
  return getCoreState();
}

/**
 * Returns the runtime state block for an asset.
 * @param {string} assetId
 * @param {object} [state]
 * @returns {object|null}
 */
export function selectAssetState(assetId, state = selectGameState()) {
  if (!assetId) return null;
  return getCoreAssetState(assetId, state);
}

/**
 * Returns shallow copies of the instances registered for an asset.
 * @param {string} assetId
 * @param {object} [state]
 * @returns {Array<object>}
 */
export function selectAssetInstances(assetId, state = selectGameState()) {
  const assetState = selectAssetState(assetId, state);
  if (!assetState) {
    return [];
  }
  return cloneInstances(assetState.instances);
}

/**
 * Counts active instances for an asset.
 * @param {string} assetId
 * @param {object} [state]
 * @returns {number}
 */
export function selectActiveAssetInstances(assetId, state = selectGameState()) {
  if (!assetId) {
    return 0;
  }
  return countActiveAssetInstancesCore(assetId, state);
}

/**
 * Returns the upgrade state entry for a given upgrade id.
 * @param {string} upgradeId
 * @param {object} [state]
 * @returns {object|null}
 */
export function selectUpgradeState(upgradeId, state = selectGameState()) {
  if (!upgradeId) return null;
  return getCoreUpgradeState(upgradeId, state);
}
