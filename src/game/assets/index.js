import { ASSETS } from './registry.js';
import { allocateAssetMaintenance, closeOutDay } from './lifecycle.js';
import { getIncomeRangeForDisplay } from './helpers.js';
import {
  performQualityAction,
  getQualityLevel,
  getQualityLevelSummary,
  getQualityActions,
  getQualityTracks
} from './quality.js';

const assetsSystem = {
  list: ASSETS,
  allocateMaintenance: allocateAssetMaintenance,
  closeOutDay,
  getIncomeRangeForDisplay,
  performQualityAction,
  getQualityLevel,
  getQualityLevelSummary,
  getQualityActions,
  getQualityTracks
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
  getQualityTracks
};
