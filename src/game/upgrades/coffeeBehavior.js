import { COFFEE_LIMIT } from '../../core/constants.js';
import { gainTime } from '../time.js';

export const coffeeHooks = {
  details: [() => `Daily limit: <strong>${COFFEE_LIMIT}</strong>`],
  actionLabel: context =>
    context.upgradeState.usedToday >= COFFEE_LIMIT ? 'Too Much Caffeine' : 'Brew Boost',
  disabled: context => {
    const { state, upgradeState } = context;
    if (!state) return true;
    if (upgradeState.usedToday >= COFFEE_LIMIT) return true;
    if (state.timeLeft <= 0) return true;
    return false;
  },
  onPurchase: context => {
    const { state, upgradeState } = context;
    upgradeState.usedToday += 1;
    state.dailyBonusTime += 1;
    gainTime(1);
  }
};
