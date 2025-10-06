import { clampMarketDay as clampDay } from '../../../../game/hustles/normalizers.js';
import {
  DEFAULT_HUSTLE_MARKET_STATE,
  clearHustleMarketState,
  cloneHustleMarketState,
  createDefaultHustleMarketState,
  ensureHustleMarketState,
  getHustleMarketState
} from './state.js';
import {
  cloneOffer,
  decorateOfferWithAccepted,
  normalizeHustleMarketOffer
} from './offers.js';
import {
  completeAcceptedEntry,
  createAcceptedEntryFromOffer,
  getClaimedEntries,
  normalizeAcceptedOffer,
  removeAcceptedEntries
} from './accepted.js';

export {
  DEFAULT_HUSTLE_MARKET_STATE,
  clearHustleMarketState,
  cloneHustleMarketState,
  createDefaultHustleMarketState,
  ensureHustleMarketState,
  getHustleMarketState,
  normalizeHustleMarketOffer
};

export function claimHustleMarketOffer(state, offerId, details = {}) {
  if (!state || !offerId) {
    return null;
  }
  const fallbackDay = details.acceptedOnDay || state.day || 1;
  const marketState = ensureHustleMarketState(state, { fallbackDay });
  const offer = marketState.offers.find(entry => entry.id === offerId);
  if (!offer) {
    return null;
  }

  const acceptedEntry = createAcceptedEntryFromOffer(offer, {
    ...details,
    acceptedOnDay: details.acceptedOnDay ?? state.day ?? offer.availableOnDay
  }, state.day || 1);

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

  ensureHustleMarketState(state, { fallbackDay: state.day || acceptedEntry.acceptedOnDay || 1 });
  return acceptedEntry;
}

export function releaseHustleMarketOffer(state, identifiers = {}) {
  if (!state) {
    return false;
  }

  const { offerId, acceptedId, instanceId } = identifiers || {};
  if (!offerId && !acceptedId && !instanceId) {
    return false;
  }

  const fallbackDay = clampDay(state.day ?? 1, 1);
  const marketState = ensureHustleMarketState(state, { fallbackDay });

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

  ensureHustleMarketState(state, { fallbackDay });
  return true;
}

export function getMarketOfferById(state, offerId, options = {}) {
  if (!state || !offerId) {
    return null;
  }
  const fallbackDay = clampDay(options.day ?? state.day ?? 1, 1);
  const marketState = ensureHustleMarketState(state, { fallbackDay });
  const offer = marketState.offers.find(entry => entry.id === offerId);
  return offer ? cloneOffer(offer) : null;
}

export function getMarketAvailableOffers(state, {
  day,
  includeUpcoming = false,
  includeClaimed = false
} = {}) {
  if (!state) {
    return [];
  }
  const fallbackDay = clampDay(day ?? state.day ?? 1, 1);
  const marketState = ensureHustleMarketState(state, { fallbackDay });
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

export function getMarketClaimedOffers(state, {
  day,
  includeExpired = false,
  includeCompleted = false
} = {}) {
  if (!state) {
    return [];
  }
  const fallbackDay = clampDay(day ?? state.day ?? 1, 1);
  const marketState = ensureHustleMarketState(state, { fallbackDay });
  return getClaimedEntries(marketState, fallbackDay, { includeExpired, includeCompleted });
}

export function completeHustleMarketInstance(state, instanceId, {
  completionDay,
  hoursLogged
} = {}) {
  if (!state || !instanceId) {
    return null;
  }

  const fallbackDay = clampDay(completionDay ?? state.day ?? 1, 1);
  const marketState = ensureHustleMarketState(state, { fallbackDay });

  const entry = marketState.accepted.find(item => item.instanceId === instanceId);
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

  ensureHustleMarketState(state, { fallbackDay });

  return marketState.accepted.find(item => item.instanceId === instanceId) || null;
}

export { normalizeAcceptedOffer };
