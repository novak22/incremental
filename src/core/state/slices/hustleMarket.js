import { structuredClone, createId } from '../../helpers.js';

const DEFAULT_STATE = Object.freeze({
  lastRolledAt: 0,
  lastRolledOnDay: 0,
  offers: []
});

function clampDay(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    const fallbackParsed = Number(fallback);
    if (!Number.isFinite(fallbackParsed) || fallbackParsed <= 0) {
      return 1;
    }
    return Math.floor(fallbackParsed);
  }
  return Math.floor(parsed);
}

function clampNonNegativeInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    const fallbackParsed = Number(fallback);
    if (!Number.isFinite(fallbackParsed) || fallbackParsed < 0) {
      return 0;
    }
    return Math.floor(fallbackParsed);
  }
  return Math.floor(parsed);
}

function buildDaysActive(startDay, endDay) {
  const start = clampDay(startDay, 1);
  const end = clampDay(endDay, start);
  const days = [];
  for (let day = start; day <= end; day += 1) {
    days.push(day);
  }
  return days;
}

export function createDefaultHustleMarketState() {
  return {
    lastRolledAt: 0,
    lastRolledOnDay: 0,
    offers: []
  };
}

export function normalizeHustleMarketOffer(offer, {
  fallbackTimestamp = Date.now(),
  fallbackDay = 1
} = {}) {
  if (!offer || typeof offer !== 'object') {
    return null;
  }

  const templateId = typeof offer.templateId === 'string' && offer.templateId
    ? offer.templateId
    : null;
  if (!templateId) {
    return null;
  }

  const variantId = typeof offer.variantId === 'string' && offer.variantId
    ? offer.variantId
    : 'default';
  const definitionId = typeof offer.definitionId === 'string' && offer.definitionId
    ? offer.definitionId
    : templateId;

  const resolvedFallbackDay = clampDay(fallbackDay, 1);
  const fallbackRolledDay = clampDay(offer.rolledOnDay, resolvedFallbackDay);
  const availableOnDay = clampDay(offer.availableOnDay, fallbackRolledDay);
  const rolledOnDay = clampDay(offer.rolledOnDay, availableOnDay);
  let expiresOnDay = clampDay(offer.expiresOnDay, availableOnDay);
  if (expiresOnDay < availableOnDay) {
    expiresOnDay = availableOnDay;
  }

  const parsedTimestamp = Number(offer.rolledAt);
  const rolledAt = Number.isFinite(parsedTimestamp) && parsedTimestamp >= 0
    ? parsedTimestamp
    : Math.max(0, Number(fallbackTimestamp) || 0);

  const metadata = typeof offer.metadata === 'object' && offer.metadata !== null
    ? structuredClone(offer.metadata)
    : {};

  const variant = typeof offer.variant === 'object' && offer.variant !== null
    ? structuredClone(offer.variant)
    : null;
  if (variant && (typeof variant.id !== 'string' || !variant.id)) {
    variant.id = variantId;
  }

  const id = typeof offer.id === 'string' && offer.id
    ? offer.id
    : `market-${definitionId}-${rolledOnDay}-${createId()}`;

  return {
    id,
    templateId,
    variantId,
    definitionId,
    rolledOnDay,
    rolledAt,
    availableOnDay,
    expiresOnDay,
    daysActive: buildDaysActive(availableOnDay, expiresOnDay),
    metadata,
    variant
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
  const normalizedOffers = offers
    .map(offer => normalizeHustleMarketOffer(offer, {
      fallbackTimestamp: marketState.lastRolledAt,
      fallbackDay: normalizedFallbackDay
    }))
    .filter(Boolean);

  marketState.offers = normalizedOffers;

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
    offers: ensured.offers.map(offer => structuredClone(offer))
  };
}

export function clearHustleMarketState(state) {
  if (!state) return;
  const marketState = ensureHustleMarketState(state);
  marketState.lastRolledAt = 0;
  marketState.lastRolledOnDay = 0;
  marketState.offers = [];
}

export { DEFAULT_STATE as DEFAULT_HUSTLE_MARKET_STATE };

