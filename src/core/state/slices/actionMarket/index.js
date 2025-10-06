import { clampMarketDay as clampDay } from '../../../../game/hustles/normalizers.js';
import {
  DEFAULT_ACTION_MARKET_CATEGORY_STATE,
  DEFAULT_ACTION_MARKET_STATE,
  clearActionMarketCategoryState,
  cloneActionMarketCategoryState,
  createDefaultActionMarketCategoryState,
  createDefaultActionMarketState,
  ensureActionMarketCategoryState,
  ensureActionMarketState,
  getActionMarketCategoryState,
  ensureHustleMarketStateCompatibility,
  createDefaultHustleMarketStateCompatibility,
  cloneHustleMarketStateCompatibility,
  clearHustleMarketStateCompatibility
} from './state.js';
import {
  cloneOffer,
  decorateOfferWithAccepted,
  normalizeActionMarketOffer
} from './offers.js';
import {
  completeAcceptedEntry,
  createAcceptedEntryFromOffer,
  getClaimedEntries,
  normalizeActionMarketAcceptedEntry,
  removeAcceptedEntries
} from './accepted.js';

export {
  DEFAULT_ACTION_MARKET_STATE,
  DEFAULT_ACTION_MARKET_CATEGORY_STATE,
  ensureActionMarketState,
  ensureActionMarketCategoryState,
  getActionMarketCategoryState,
  createDefaultActionMarketState,
  createDefaultActionMarketCategoryState,
  cloneActionMarketCategoryState,
  clearActionMarketCategoryState,
  normalizeActionMarketOffer,
  normalizeActionMarketAcceptedEntry
};

export function claimActionMarketOffer(state, category, offerId, details = {}) {
  if (!state || !offerId) {
    return null;
  }

  const fallbackDay = details.acceptedOnDay || state.day || 1;
  const marketState = ensureActionMarketCategoryState(state, category, { fallbackDay });
  const offer = marketState.offers.find(entry => entry.id === offerId);
  if (!offer) {
    return null;
  }

  const acceptedEntry = createAcceptedEntryFromOffer(offer, {
    ...details,
    acceptedOnDay: details.acceptedOnDay ?? state.day ?? offer.availableOnDay
  }, {
    fallbackDay: state.day || 1,
    category: marketState.category
  });

  if (!acceptedEntry) {
    return null;
  }

  const existingIndex = marketState.accepted.findIndex(entry => entry.offerId === offer.id);
  if (existingIndex >= 0) {
    marketState.accepted[existingIndex] = acceptedEntry;
  } else {
    marketState.accepted.push(acceptedEntry);
  }

  decorateOfferWithAccepted(offer, acceptedEntry);

  ensureActionMarketCategoryState(state, marketState.category, {
    fallbackDay: state.day || acceptedEntry.acceptedOnDay || 1
  });
  return acceptedEntry;
}

export function releaseActionMarketOffer(state, category, identifiers = {}) {
  if (!state) {
    return false;
  }

  const { offerId, acceptedId, instanceId } = identifiers || {};
  if (!offerId && !acceptedId && !instanceId) {
    return false;
  }

  const fallbackDay = clampDay(state.day ?? 1, 1);
  const marketState = ensureActionMarketCategoryState(state, category, { fallbackDay });

  const removedEntries = removeAcceptedEntries(marketState, identifiers);
  if (removedEntries.length === 0) {
    return false;
  }

  removedEntries.forEach(entry => {
    const offer = marketState.offers.find(item => item && item.id === entry.offerId);
    if (!offer) {
      return;
    }
    decorateOfferWithAccepted(offer, null);
  });

  ensureActionMarketCategoryState(state, category, { fallbackDay });
  return true;
}

export function getActionMarketOfferById(state, category, offerId, options = {}) {
  if (!state || !offerId) {
    return null;
  }
  const fallbackDay = clampDay(options.day ?? state.day ?? 1, 1);
  const marketState = ensureActionMarketCategoryState(state, category, { fallbackDay });
  const offer = marketState.offers.find(entry => entry.id === offerId);
  return offer ? cloneOffer(offer) : null;
}

export function getActionMarketAvailableOffers(state, category, {
  day,
  includeUpcoming = false,
  includeClaimed = false
} = {}) {
  if (!state) {
    return [];
  }
  const fallbackDay = clampDay(day ?? state.day ?? 1, 1);
  const marketState = ensureActionMarketCategoryState(state, category, { fallbackDay });
  return marketState.offers
    .filter(offer => {
      if (offer.status === 'complete') {
        return false;
      }
      if (!includeClaimed && offer.claimed) {
        return false;
      }
      if (includeUpcoming) {
        return offer.expiresOnDay >= fallbackDay;
      }
      return offer.availableOnDay <= fallbackDay && offer.expiresOnDay >= fallbackDay;
    })
    .map(offer => cloneOffer(offer));
}

export function getActionMarketClaimedOffers(state, category, {
  day,
  includeExpired = false,
  includeCompleted = false
} = {}) {
  if (!state) {
    return [];
  }
  const fallbackDay = clampDay(day ?? state.day ?? 1, 1);
  const marketState = ensureActionMarketCategoryState(state, category, { fallbackDay });
  return getClaimedEntries(marketState, fallbackDay, { includeExpired, includeCompleted });
}

export function completeActionMarketInstance(state, category, instanceId, {
  completionDay,
  hoursLogged
} = {}) {
  if (!state || !instanceId) {
    return null;
  }

  const categoryKey = typeof category === 'string'
    ? (category.trim().length ? category.trim() : 'default')
    : 'default';
  const marketStateRoot = ensureActionMarketState(state);
  const existingCategoryState = marketStateRoot.categories?.[categoryKey];
  const staleEntry = existingCategoryState?.accepted?.find?.(item => item?.instanceId === instanceId) || null;

  const fallbackDay = clampDay(completionDay ?? state.day ?? staleEntry?.acceptedOnDay ?? 1, 1);
  const marketState = ensureActionMarketCategoryState(state, category, { fallbackDay });

  let entry = marketState.accepted.find(item => item.instanceId === instanceId);
  if (!entry && staleEntry) {
    const normalized = normalizeActionMarketAcceptedEntry(staleEntry, {
      fallbackDay,
      category: marketState.category
    });
    if (normalized) {
      if (normalized.status !== 'complete' && normalized.deadlineDay < fallbackDay) {
        normalized.status = 'expired';
        normalized.expired = true;
      } else if ('expired' in normalized) {
        delete normalized.expired;
      }
      marketState.accepted.push(normalized);
      entry = normalized;
    }
  }
  if (!entry) {
    return null;
  }

  completeAcceptedEntry(entry, {
    completionDay,
    hoursLogged,
    fallbackDay
  });

  const offer = marketState.offers.find(item => item.id === entry.offerId);
  if (offer) {
    decorateOfferWithAccepted(offer, entry);
  }

  ensureActionMarketCategoryState(state, category, { fallbackDay });

  return marketState.accepted.find(item => item.instanceId === instanceId) || null;
}

// Compatibility exports for the legacy hustle market modules.
export const DEFAULT_HUSTLE_MARKET_STATE = DEFAULT_ACTION_MARKET_CATEGORY_STATE;
export const createDefaultHustleMarketState = createDefaultHustleMarketStateCompatibility;
export const ensureHustleMarketState = ensureHustleMarketStateCompatibility;
export const cloneHustleMarketState = cloneHustleMarketStateCompatibility;
export const clearHustleMarketState = clearHustleMarketStateCompatibility;
export const getHustleMarketState = (state, options = {}) => ensureHustleMarketStateCompatibility(state, options);

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

export { normalizeActionMarketAcceptedEntry as normalizeAcceptedOffer };
