import { structuredClone, createId } from '../../helpers.js';

const DEFAULT_STATE = Object.freeze({
  lastRolledAt: 0,
  lastRolledOnDay: 0,
  offers: [],
  accepted: []
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

function clampNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    const fallbackParsed = Number(fallback);
    if (!Number.isFinite(fallbackParsed) || fallbackParsed < 0) {
      return 0;
    }
    return fallbackParsed;
  }
  return parsed;
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
    offers: [],
    accepted: []
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

  const claimedOnDay = offer.claimedOnDay != null
    ? clampDay(offer.claimedOnDay, availableOnDay)
    : null;
  const instanceId = typeof offer.instanceId === 'string' && offer.instanceId
    ? offer.instanceId
    : null;

  const normalized = {
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
    variant,
    claimed: offer.claimed === true || claimedOnDay != null,
    claimedOnDay,
    instanceId,
    status: offer.status === 'claimed' || offer.claimed === true
      ? 'claimed'
      : 'available'
  };

  if (normalized.claimed) {
    normalized.status = 'claimed';
  }

  return normalized;
}

function normalizeAcceptedOffer(entry, { fallbackDay = 1 } = {}) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const offerId = typeof entry.offerId === 'string' && entry.offerId
    ? entry.offerId
    : null;
  const templateId = typeof entry.templateId === 'string' && entry.templateId
    ? entry.templateId
    : null;
  if (!offerId || !templateId) {
    return null;
  }

  const definitionId = typeof entry.definitionId === 'string' && entry.definitionId
    ? entry.definitionId
    : templateId;

  const acceptedOnDay = clampDay(entry.acceptedOnDay, fallbackDay);
  const deadlineDay = clampDay(entry.deadlineDay, acceptedOnDay);
  const hoursRequired = clampNonNegativeNumber(entry.hoursRequired, 0);
  const metadata = typeof entry.metadata === 'object' && entry.metadata !== null
    ? structuredClone(entry.metadata)
    : {};
  const payout = typeof entry.payout === 'object' && entry.payout !== null
    ? { ...entry.payout }
    : {};
  if (payout.amount != null) {
    payout.amount = clampNonNegativeNumber(payout.amount, 0);
  }
  if (!payout.schedule) {
    payout.schedule = 'onCompletion';
  }

  const instanceId = typeof entry.instanceId === 'string' && entry.instanceId
    ? entry.instanceId
    : null;

  return {
    id: typeof entry.id === 'string' && entry.id ? entry.id : `accepted-${offerId}-${createId()}`,
    offerId,
    templateId,
    definitionId,
    acceptedOnDay,
    deadlineDay,
    hoursRequired,
    instanceId,
    payout,
    status: entry.status === 'complete' ? 'complete' : 'active',
    metadata
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
    .filter(entry => entry && entry.deadlineDay >= normalizedFallbackDay);

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

  const normalizedOffersById = new Map();
  normalizedOffers.forEach(offer => {
    normalizedOffersById.set(offer.id, offer);
    const acceptedEntry = acceptedByOffer.get(offer.id);
    if (acceptedEntry) {
      offer.claimed = true;
      offer.status = 'claimed';
      offer.claimedOnDay = acceptedEntry.acceptedOnDay;
      offer.instanceId = acceptedEntry.instanceId;
      offer.claimMetadata = structuredClone(acceptedEntry.metadata || {});
      offer.claimDeadlineDay = acceptedEntry.deadlineDay;
    } else {
      offer.claimed = false;
      offer.status = 'available';
      offer.claimedOnDay = null;
      offer.instanceId = null;
      delete offer.claimMetadata;
      delete offer.claimDeadlineDay;
    }
  });

  const filteredAccepted = normalizedAccepted.filter(entry => normalizedOffersById.has(entry.offerId));

  marketState.offers = normalizedOffers;
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

export function claimHustleMarketOffer(state, offerId, details = {}) {
  if (!state || !offerId) {
    return null;
  }
  const marketState = ensureHustleMarketState(state, { fallbackDay: details.acceptedOnDay || state.day || 1 });
  const offer = marketState.offers.find(entry => entry.id === offerId);
  if (!offer) {
    return null;
  }

  const acceptedEntry = normalizeAcceptedOffer({
    offerId: offer.id,
    templateId: offer.templateId,
    definitionId: offer.definitionId,
    acceptedOnDay: details.acceptedOnDay ?? state.day ?? offer.availableOnDay,
    deadlineDay: details.deadlineDay ?? offer.expiresOnDay,
    hoursRequired: details.hoursRequired ?? offer.metadata?.hoursRequired ?? offer.metadata?.requirements?.hours ?? 0,
    instanceId: details.instanceId ?? offer.instanceId ?? null,
    payout: details.payout ?? offer.metadata?.payout ?? {},
    status: details.status ?? 'active',
    metadata: details.metadata ?? offer.metadata ?? {}
  }, { fallbackDay: state.day || 1 });

  if (!acceptedEntry) {
    return null;
  }

  const existingIndex = marketState.accepted.findIndex(entry => entry.offerId === offer.id);
  if (existingIndex >= 0) {
    marketState.accepted[existingIndex] = acceptedEntry;
  } else {
    marketState.accepted.push(acceptedEntry);
  }

  offer.claimed = true;
  offer.status = 'claimed';
  offer.claimedOnDay = acceptedEntry.acceptedOnDay;
  offer.instanceId = acceptedEntry.instanceId;
  offer.claimMetadata = structuredClone(acceptedEntry.metadata || {});
  offer.claimDeadlineDay = acceptedEntry.deadlineDay;

  ensureHustleMarketState(state, { fallbackDay: state.day || acceptedEntry.acceptedOnDay || 1 });
  return acceptedEntry;
}

export function getMarketOfferById(state, offerId, options = {}) {
  if (!state || !offerId) {
    return null;
  }
  const fallbackDay = clampDay(options.day ?? state.day ?? 1, 1);
  const marketState = ensureHustleMarketState(state, { fallbackDay });
  const offer = marketState.offers.find(entry => entry.id === offerId);
  return offer ? structuredClone(offer) : null;
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
      if (!includeClaimed && offer.claimed) {
        return false;
      }
      if (includeUpcoming) {
        return offer.expiresOnDay >= fallbackDay;
      }
      return offer.availableOnDay <= fallbackDay && offer.expiresOnDay >= fallbackDay;
    })
    .map(offer => structuredClone(offer));
}

export function getMarketClaimedOffers(state, {
  day,
  includeExpired = false
} = {}) {
  if (!state) {
    return [];
  }
  const fallbackDay = clampDay(day ?? state.day ?? 1, 1);
  const marketState = ensureHustleMarketState(state, { fallbackDay });
  return marketState.accepted
    .filter(entry => includeExpired || entry.deadlineDay >= fallbackDay)
    .map(entry => structuredClone(entry));
}

export { DEFAULT_STATE as DEFAULT_HUSTLE_MARKET_STATE };

