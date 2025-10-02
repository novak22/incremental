import { getAssetDefinition } from '../../core/state/registry.js';

// Temporary compatibility layer for modules that still expect helper exports
export {
  buildAssetAction,
  calculateAssetSalePrice,
  sellAssetInstance,
  setAssetInstanceName,
  isLaunchAvailable
} from './actions.js';
export { formatMaintenanceSummary, maintenanceDetail } from './maintenance.js';
export {
  ownedDetail,
  setupDetail,
  setupCostDetail,
  incomeDetail,
  latestYieldDetail,
  instanceLabel,
  qualitySummaryDetail,
  qualityProgressDetail
} from './details.js';
export { getDailyIncomeRange, rollDailyIncome, getIncomeRangeForDisplay } from './payout.js';

export function fallbackAssetMetricId(definitionId, scope, type) {
  if (!definitionId) return null;
  if (scope === 'payout' && type === 'payout') {
    return `asset:${definitionId}:payout`;
  }
  if (scope === 'sale' && type === 'payout') {
    return `asset:${definitionId}:sale`;
  }
  const suffix = type === 'payout' ? 'payout' : type;
  return `asset:${definitionId}:${scope}-${suffix}`;
}

export function getAssetMetricId(definitionOrId, scope, type) {
  if (!definitionOrId) return null;
  const definition =
    typeof definitionOrId === 'string' ? getAssetDefinition(definitionOrId) : definitionOrId;
  if (!definition) return null;

  const metricIds = definition.metricIds || {};
  const scoped = metricIds[scope];
  if (scoped && typeof scoped === 'object') {
    const value = scoped[type];
    if (value) return value;
  }
  return fallbackAssetMetricId(definition.id, scope, type);
}

const AssetHelpers = {
  fallbackAssetMetricId,
  getAssetMetricId
};

export default AssetHelpers;
