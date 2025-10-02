import { getAssetState, getUpgradeState } from '../../core/state.js';

export const courseHooks = {
  cardState: (_state, card) => {
    if (!card) return;
    const upgradeState = getUpgradeState('course');
    const assetState = getAssetState('blog');
    const instances = assetState?.instances || [];
    const blogActive = instances.filter(instance => instance.status === 'active').length > 0;
    card.classList.toggle('locked', !blogActive && !upgradeState?.purchased);
  }
};
