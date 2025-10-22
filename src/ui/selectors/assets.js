import { formatMaintenanceSummary } from '../../game/assets/maintenance.js';
import { getInstanceNicheInfo } from '../../game/assets/niches.js';
import { getQualityActions } from '../../game/assets/quality/actions.js';
import {
  getInstanceQualityRange,
  getQualityLevel
} from '../../game/assets/quality/levels.js';
import { getAssetEvents, getNicheEvents } from '../../game/events/index.js';
import { instanceLabel } from '../../game/assets/details.js';
import { selectGameState } from './state.js';

/**
 * Formats the maintenance summary for an asset definition.
 * @param {object} definition
 * @returns {object}
 */
export function selectMaintenanceSummary(definition) {
  return formatMaintenanceSummary(definition);
}

/**
 * Resolves the niche info snapshot for an asset instance.
 * @param {object} instance
 * @param {object} [state]
 * @returns {object|null}
 */
export function selectInstanceNicheInfo(instance, state = selectGameState()) {
  return getInstanceNicheInfo(instance, state);
}

/**
 * Returns the quality actions available for an asset definition.
 * @param {object} definition
 * @returns {Array<object>}
 */
export function selectQualityActions(definition) {
  return getQualityActions(definition);
}

/**
 * Returns the quality range descriptor for an asset instance.
 * @param {object} definition
 * @param {object} instance
 * @returns {object|null}
 */
export function selectQualityRange(definition, instance) {
  return getInstanceQualityRange(definition, instance);
}

/**
 * Returns the definition entry for a given quality level.
 * @param {object} definition
 * @param {number} level
 * @returns {object|null}
 */
export function selectQualityLevel(definition, level) {
  return getQualityLevel(definition, level);
}

/**
 * Returns active asset events for the requested instance.
 * @param {string} assetId
 * @param {string} instanceId
 * @param {object} [state]
 * @returns {Array<object>}
 */
export function selectAssetEvents(assetId, instanceId, state = selectGameState()) {
  if (!assetId || !instanceId) {
    return [];
  }
  return getAssetEvents(state, assetId, instanceId) || [];
}

/**
 * Returns niche events affecting the provided niche id.
 * @param {string} nicheId
 * @param {object} [state]
 * @returns {Array<object>}
 */
export function selectNicheEvents(nicheId, state = selectGameState()) {
  if (!nicheId) {
    return [];
  }
  return getNicheEvents(state, nicheId) || [];
}

/**
 * Generates a display label for an asset instance.
 * @param {object} definition
 * @param {number} index
 * @param {object} [options]
 * @returns {string}
 */
export function selectInstanceLabel(definition, index, options) {
  return instanceLabel(definition, index, options);
}
