import { ASSETS } from './registry.js';
import { allocateAssetMaintenance, closeOutDay } from './lifecycle.js';
import { getIncomeRangeForDisplay } from './payout.js';
import { performQualityAction as performQualityActionInternal } from './quality/actions.js';
import { scheduleDayEndCheck } from '../time/dayEndScheduler.js';

export function performQualityAction(...args) {
  const result = performQualityActionInternal(...args);
  scheduleDayEndCheck();
  return result;
}

export { ASSETS, allocateAssetMaintenance, closeOutDay, getIncomeRangeForDisplay };
