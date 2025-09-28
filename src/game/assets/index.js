import { ASSETS } from './registry.js';
import { allocateAssetMaintenance, closeOutDay } from './lifecycle.js';
import { getIncomeRangeForDisplay } from './helpers.js';

const assetsSystem = {
  list: ASSETS,
  allocateMaintenance: allocateAssetMaintenance,
  closeOutDay,
  getIncomeRangeForDisplay
};

export default assetsSystem;
export { ASSETS, allocateAssetMaintenance, closeOutDay, getIncomeRangeForDisplay };
