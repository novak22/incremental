import { clampMarketDay as clampDay } from '../../../../game/hustles/normalizers.js';
import { ensureActionMarketCategoryState } from './state.js';
import { cloneOffer } from './offers.js';
import { getClaimedEntries } from './accepted.js';

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

