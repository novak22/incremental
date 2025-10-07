import {
  DEFAULT_ACTION_MARKET_CATEGORY_STATE,
  clearActionMarketCategoryState,
  cloneActionMarketCategoryState,
  createDefaultActionMarketCategoryState,
  ensureActionMarketCategoryState
} from './state.js';
import {
  claimActionMarketOffer,
  completeActionMarketInstance,
  releaseActionMarketOffer
} from './commands.js';
import {
  getActionMarketAvailableOffers,
  getActionMarketClaimedOffers,
  getActionMarketOfferById
} from './selectors.js';

export const DEFAULT_HUSTLE_MARKET_STATE = DEFAULT_ACTION_MARKET_CATEGORY_STATE;

export function createDefaultHustleMarketState() {
  return createDefaultActionMarketCategoryState({ category: 'hustle' });
}

export function ensureHustleMarketState(state, options = {}) {
  const categoryState = ensureActionMarketCategoryState(state, 'hustle', options);
  mirrorHustleMarketState(state, categoryState);
  return categoryState;
}

export function getHustleMarketState(state, options = {}) {
  return ensureHustleMarketState(state, options);
}

export function cloneHustleMarketState(state) {
  return cloneActionMarketCategoryState(state, 'hustle');
}

export function clearHustleMarketState(state) {
  clearActionMarketCategoryState(state, 'hustle');
}

export function mirrorHustleMarketState(state, categoryState = null) {
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

export function claimHustleMarketOffer(state, offerId, details = {}) {
  return claimActionMarketOffer(state, 'hustle', offerId, details);
}

export function releaseHustleMarketOffer(state, identifiers = {}) {
  return releaseActionMarketOffer(state, 'hustle', identifiers);
}

export function getMarketOfferById(state, offerId, options = {}) {
  return getActionMarketOfferById(state, 'hustle', offerId, options);
}

export function getMarketAvailableOffers(state, options = {}) {
  return getActionMarketAvailableOffers(state, 'hustle', options);
}

export function getMarketClaimedOffers(state, options = {}) {
  return getActionMarketClaimedOffers(state, 'hustle', options);
}

export function completeHustleMarketInstance(state, instanceId, details = {}) {
  return completeActionMarketInstance(state, 'hustle', instanceId, details);
}

