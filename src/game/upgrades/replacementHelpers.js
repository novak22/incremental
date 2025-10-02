import { getUpgradeState } from '../../core/state.js';

export function createReplacementHooks(previousUpgradeId) {
  return {
    onPurchase: () => {
      if (!previousUpgradeId) return;
      const previous = getUpgradeState(previousUpgradeId);
      if (previous) {
        previous.purchased = false;
        previous.purchasedDay = null;
      }
    }
  };
}
