import { ASSETS } from './registry.js';
import { allocateAssetMaintenance, closeOutDay, maintainAssetInstance } from './lifecycle.js';
import {
  getIncomeRangeForDisplay,
  calculateAssetSalePrice,
  sellAssetInstance
} from './helpers.js';
import {
  performQualityAction,
  getQualityLevel,
  getQualityLevelSummary,
  getQualityActions,
  getQualityTracks
} from './quality.js';
import {
  assignInstanceToNiche,
  getAssignableNicheSummaries,
  getInstanceNicheEffect,
  getNichePopularity,
  getNicheRoster,
  rerollNichePopularity
} from './niches.js';

const assetsSystem = {
  list: ASSETS,
  allocateMaintenance: allocateAssetMaintenance,
  maintainInstance: maintainAssetInstance,
  closeOutDay,
  getIncomeRangeForDisplay,
  performQualityAction,
  getQualityLevel,
  getQualityLevelSummary,
  getQualityActions,
  getQualityTracks,
  sellAssetInstance,
  calculateSalePrice: calculateAssetSalePrice,
  niches: {
    assignInstance: assignInstanceToNiche,
    getAssignableSummaries: getAssignableNicheSummaries,
    getInstanceEffect: getInstanceNicheEffect,
    getPopularity: getNichePopularity,
    getRoster: getNicheRoster,
    reroll: rerollNichePopularity
  }
};

export default assetsSystem;
export {
  ASSETS,
  allocateAssetMaintenance,
  closeOutDay,
  getIncomeRangeForDisplay,
  performQualityAction,
  getQualityLevel,
  getQualityLevelSummary,
  getQualityActions,
  getQualityTracks,
  sellAssetInstance,
  calculateAssetSalePrice,
  maintainAssetInstance,
  assignInstanceToNiche,
  getAssignableNicheSummaries,
  getInstanceNicheEffect,
  getNichePopularity,
  getNicheRoster,
  rerollNichePopularity
};
