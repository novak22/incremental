import {
  createDefaultActionMarketCategoryState,
  ensureActionMarketCategoryState
} from './state.js';
import { completeActionMarketInstance } from './commands.js';

export function createDefaultHustleMarketState() {
  return createDefaultActionMarketCategoryState({ category: 'hustle' });
}

export function ensureHustleMarketState(state, options = {}) {
  const categoryState = ensureActionMarketCategoryState(state, 'hustle', options);
  mirrorHustleMarketState(state, categoryState);
  return categoryState;
}

function mirrorHustleMarketState(state, categoryState = null) {
  if (!state || typeof state !== 'object') {
    return;
  }

  const marketState = state.actionMarket;
  const categories = marketState?.categories;
  if (!marketState || typeof marketState !== 'object' || !categories || typeof categories !== 'object') {
    return;
  }

  const resolvedCategory = categoryState || categories.hustle || state.hustleMarket || null;
  if (resolvedCategory) {
    categories.hustle = resolvedCategory;
    state.hustleMarket = resolvedCategory;
  } else if (!state.hustleMarket) {
    state.hustleMarket = ensureActionMarketCategoryState(state, 'hustle');
    categories.hustle = state.hustleMarket;
  }
}

export function completeHustleMarketInstance(state, instanceId, details = {}) {
  return completeActionMarketInstance(state, 'hustle', instanceId, details);
}

