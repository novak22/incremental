import { ASSETS } from './registry.js';
import { allocateAssetMaintenance, closeOutDay } from './lifecycle.js';
import {
  getIncomeRangeForDisplay,
  calculateAssetSalePrice,
  sellAssetInstance
} from './helpers.js';

const assetsSystem = {
  list: ASSETS,
  allocateMaintenance: allocateAssetMaintenance,
  closeOutDay,
  getIncomeRangeForDisplay,
  sellAssetInstance,
  calculateSalePrice: calculateAssetSalePrice
};

export default assetsSystem;
export {
  ASSETS,
  allocateAssetMaintenance,
  closeOutDay,
  getIncomeRangeForDisplay,
  sellAssetInstance,
  calculateAssetSalePrice
};
