import { structuredClone } from '../../../helpers.js';
import {
  clampMarketDay as clampDay,
  clampMarketDaySpan as clampNonNegativeInteger,
  clampMarketPositiveInteger as clampPositiveInteger
} from '../../../../game/hustles/normalizers.js';
import { decorateOfferWithAccepted, normalizeActionMarketOffer } from './offers.js';
import { createAcceptedEntryFromOffer, normalizeActionMarketAcceptedEntry } from './accepted.js';

export const DEFAULT_ACTION_MARKET_CATEGORY_STATE = Object.freeze({
  category: null,
  lastRolledAt: 0,
  lastRolledOnDay: 0,
  offers: [],
  accepted: []
});

export const DEFAULT_ACTION_MARKET_STATE = Object.freeze({
  categories: Object.freeze({})
});

export function createDefaultActionMarketCategoryState({ category = null } = {}) {
  return {
    category,
    lastRolledAt: 0,
    lastRolledOnDay: 0,
    offers: [],
    accepted: []
  };
}

export function createDefaultActionMarketState() {
  return { categories: {} };
}

function normalizeCategoryKey(category) {
  if (typeof category !== 'string') {
    return 'default';
  }
  const trimmed = category.trim();
  return trimmed.length ? trimmed : 'default';
}

function normalizeCategoryState(categoryState, {
  fallbackDay = 1,
  category
} = {}) {
  if (!categoryState || typeof categoryState !== 'object') {
    return createDefaultActionMarketCategoryState({ category });
  }

  const normalizedFallbackDay = clampDay(fallbackDay, 1);
  categoryState.category = category;
  categoryState.lastRolledOnDay = clampNonNegativeInteger(categoryState.lastRolledOnDay, 0);

  const parsedTimestamp = Number(categoryState.lastRolledAt);
  categoryState.lastRolledAt = Number.isFinite(parsedTimestamp) && parsedTimestamp >= 0
    ? parsedTimestamp
    : 0;

  const offers = Array.isArray(categoryState.offers) ? categoryState.offers : [];
  const accepted = Array.isArray(categoryState.accepted) ? categoryState.accepted : [];

  const normalizedAccepted = accepted
    .map(entry => normalizeActionMarketAcceptedEntry(entry, {
      fallbackDay: normalizedFallbackDay,
      category
    }))
    .filter(entry => Boolean(entry))
    .map(entry => {
      if (entry.status !== 'complete' && entry.deadlineDay < normalizedFallbackDay) {
        entry.status = 'expired';
        entry.expired = true;
      } else if ('expired' in entry) {
        delete entry.expired;
      }
      return entry;
    });

  const acceptedByOffer = new Map();
  normalizedAccepted.forEach(entry => {
    acceptedByOffer.set(entry.offerId, entry);
  });

  const normalizedOffers = offers
    .map(offer => normalizeActionMarketOffer(offer, {
      fallbackTimestamp: categoryState.lastRolledAt,
      fallbackDay: normalizedFallbackDay,
      category
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
    if (!offer.templateCategory && category) {
      offer.templateCategory = category;
    }
  });

  const filteredAccepted = normalizedAccepted.filter(entry => {
    if (normalizedOffersById.has(entry.offerId)) {
      return true;
    }
    return entry.status === 'complete' || entry.status === 'expired';
  });

  categoryState.offers = dedupedOffers;
  categoryState.accepted = filteredAccepted;

  return categoryState;
}

function isActionMarketCategory(value) {
  return value && typeof value === 'object';
}

function categoryHasEntries(category) {
  if (!isActionMarketCategory(category)) {
    return false;
  }

  const offers = Array.isArray(category.offers) ? category.offers.length : 0;
  const accepted = Array.isArray(category.accepted) ? category.accepted.length : 0;
  return offers > 0 || accepted > 0;
}

function synchronizeHustleCategory(state, marketState) {
  const categories = marketState.categories;
  const hustleCategory = isActionMarketCategory(categories.hustle)
    ? categories.hustle
    : null;
  const hustleState = isActionMarketCategory(state.hustleMarket)
    ? state.hustleMarket
    : null;

  if (hustleCategory && hustleState && hustleCategory !== hustleState) {
    if (categoryHasEntries(hustleState) && !categoryHasEntries(hustleCategory)) {
      categories.hustle = hustleState;
    } else {
      state.hustleMarket = hustleCategory;
    }
  } else if (hustleState && !hustleCategory) {
    categories.hustle = hustleState;
  } else if (hustleCategory && !hustleState) {
    state.hustleMarket = hustleCategory;
  }

  const resolved = isActionMarketCategory(categories.hustle)
    ? categories.hustle
    : isActionMarketCategory(state.hustleMarket)
      ? state.hustleMarket
      : null;

  if (resolved) {
    categories.hustle = resolved;
    state.hustleMarket = resolved;
  }
}

export function ensureActionMarketState(state) {
  if (!state) {
    return createDefaultActionMarketState();
  }

  if (!state.actionMarket || typeof state.actionMarket !== 'object') {
    state.actionMarket = createDefaultActionMarketState();
  }

  const marketState = state.actionMarket;
  if (!marketState.categories || typeof marketState.categories !== 'object') {
    marketState.categories = {};
  }

  synchronizeHustleCategory(state, marketState);

  return marketState;
}

export function ensureActionMarketCategoryState(state, category = 'default', options = {}) {
  const key = normalizeCategoryKey(category);
  const marketState = ensureActionMarketState(state);
  if (!marketState.categories[key] || typeof marketState.categories[key] !== 'object') {
    marketState.categories[key] = createDefaultActionMarketCategoryState({ category: key });
  }

  const categoryState = marketState.categories[key];
  normalizeCategoryState(categoryState, {
    fallbackDay: options.fallbackDay,
    category: key
  });

  return categoryState;
}

export function getActionMarketCategoryState(state, category = 'default', options = {}) {
  return ensureActionMarketCategoryState(state, category, options);
}

export function cloneActionMarketCategoryState(state, category = 'default') {
  const ensured = getActionMarketCategoryState(state, category);
  return {
    category: ensured.category,
    lastRolledAt: ensured.lastRolledAt,
    lastRolledOnDay: ensured.lastRolledOnDay,
    offers: ensured.offers.map(offer => structuredClone(offer)),
    accepted: ensured.accepted.map(entry => structuredClone(entry))
  };
}

export function clearActionMarketCategoryState(state, category = 'default') {
  if (!state) return;
  const categoryState = ensureActionMarketCategoryState(state, category);
  categoryState.lastRolledAt = 0;
  categoryState.lastRolledOnDay = 0;
  categoryState.offers = [];
  categoryState.accepted = [];
}

export function createDefaultHustleMarketStateCompatibility() {
  return createDefaultActionMarketCategoryState({ category: 'hustle' });
}

export function cloneHustleMarketStateCompatibility(state) {
  return cloneActionMarketCategoryState(state, 'hustle');
}

export function clearHustleMarketStateCompatibility(state) {
  clearActionMarketCategoryState(state, 'hustle');
}

export function createAcceptedEntryForCategory(offer, details = {}, {
  fallbackDay = 1,
  category
} = {}) {
  return createAcceptedEntryFromOffer(offer, details, { fallbackDay, category });
}
