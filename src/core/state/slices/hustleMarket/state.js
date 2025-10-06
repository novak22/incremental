import { structuredClone } from '../../../helpers.js';
import {
  clampMarketDay as clampDay,
  clampMarketDaySpan as clampNonNegativeInteger,
  clampMarketPositiveInteger as clampPositiveInteger
} from '../../../../game/hustles/normalizers.js';
import { decorateOfferWithAccepted, normalizeHustleMarketOffer } from './offers.js';
import { normalizeAcceptedOffer } from './accepted.js';

export const DEFAULT_HUSTLE_MARKET_STATE = Object.freeze({
  lastRolledAt: 0,
  lastRolledOnDay: 0,
  offers: [],
  accepted: []
});

export function createDefaultHustleMarketState() {
  return {
    lastRolledAt: 0,
    lastRolledOnDay: 0,
    offers: [],
    accepted: []
  };
}

export function ensureHustleMarketState(state, { fallbackDay = 1 } = {}) {
  if (!state) {
    return createDefaultHustleMarketState();
  }

  if (!state.hustleMarket || typeof state.hustleMarket !== 'object') {
    state.hustleMarket = createDefaultHustleMarketState();
  }

  const marketState = state.hustleMarket;

  const normalizedFallbackDay = clampDay(fallbackDay, 1);
  marketState.lastRolledOnDay = clampNonNegativeInteger(marketState.lastRolledOnDay, 0);

  const parsedTimestamp = Number(marketState.lastRolledAt);
  marketState.lastRolledAt = Number.isFinite(parsedTimestamp) && parsedTimestamp >= 0
    ? parsedTimestamp
    : 0;

  const offers = Array.isArray(marketState.offers) ? marketState.offers : [];
  const accepted = Array.isArray(marketState.accepted) ? marketState.accepted : [];

  const normalizedAccepted = accepted
    .map(entry => normalizeAcceptedOffer(entry, { fallbackDay: normalizedFallbackDay }))
    .filter(entry => entry && (entry.status === 'complete' || entry.deadlineDay >= normalizedFallbackDay));

  const acceptedByOffer = new Map();
  normalizedAccepted.forEach(entry => {
    acceptedByOffer.set(entry.offerId, entry);
  });

  const normalizedOffers = offers
    .map(offer => normalizeHustleMarketOffer(offer, {
      fallbackTimestamp: marketState.lastRolledAt,
      fallbackDay: normalizedFallbackDay
    }))
    .filter(offer => offer && offer.expiresOnDay >= normalizedFallbackDay);

  const normalizedOffersByKey = new Map();
  const dedupedOffers = [];
  normalizedOffers.forEach(offer => {
    const dedupeKey = `${offer.templateId}::${offer.variantId}::${offer.id}`;
    if (normalizedOffersByKey.has(dedupeKey)) {
      return;
    }
    normalizedOffersByKey.set(dedupeKey, offer);
    dedupedOffers.push(offer);
  });

  const normalizedOffersById = new Map();
  dedupedOffers.forEach(offer => {
    normalizedOffersById.set(offer.id, offer);
    const acceptedEntry = acceptedByOffer.get(offer.id);
    decorateOfferWithAccepted(offer, acceptedEntry || null);
    offer.seats = clampPositiveInteger(offer.seats, 1);
  });

  const filteredAccepted = normalizedAccepted.filter(entry => normalizedOffersById.has(entry.offerId));

  marketState.offers = dedupedOffers;
  marketState.accepted = filteredAccepted;

  return marketState;
}

export function getHustleMarketState(state, options = {}) {
  if (!state) {
    return createDefaultHustleMarketState();
  }
  return ensureHustleMarketState(state, options);
}

export function cloneHustleMarketState(state) {
  const ensured = getHustleMarketState(state);
  return {
    lastRolledAt: ensured.lastRolledAt,
    lastRolledOnDay: ensured.lastRolledOnDay,
    offers: ensured.offers.map(offer => structuredClone(offer)),
    accepted: ensured.accepted.map(entry => structuredClone(entry))
  };
}

export function clearHustleMarketState(state) {
  if (!state) return;
  const marketState = ensureHustleMarketState(state);
  marketState.lastRolledAt = 0;
  marketState.lastRolledOnDay = 0;
  marketState.offers = [];
  marketState.accepted = [];
}
