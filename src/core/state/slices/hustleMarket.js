import { structuredClone, createId } from '../../helpers.js';
import {
  clampMarketDay as clampDay,
  clampMarketDaySpan as clampNonNegativeInteger,
  clampMarketNonNegativeNumber as clampNonNegativeNumber,
  clampMarketPositiveInteger as clampPositiveInteger,
  cloneMarketMetadata
} from '../../../game/hustles/normalizers.js';

const DEFAULT_STATE = Object.freeze({
  lastRolledAt: 0,
  lastRolledOnDay: 0,
  offers: [],
  accepted: []
});

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

  const metadata = cloneMarketMetadata(offer.metadata);

  const variant = typeof offer.variant === 'object' && offer.variant !== null
    ? structuredClone(offer.variant)
    : null;
  if (variant && (typeof variant.id !== 'string' || !variant.id)) {
    variant.id = variantId;
  }
  if (variant) {
    variant.seats = clampPositiveInteger(variant.seats, offer.seats ?? 1);
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
  const templateCategory = typeof offer.templateCategory === 'string' && offer.templateCategory.trim().length
    ? offer.templateCategory.trim()
    : null;
  const seats = clampPositiveInteger(offer.seats, 1);

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
      : 'available',
    templateCategory,
    seats
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

  const variantId = typeof entry.variantId === 'string' && entry.variantId
    ? entry.variantId
    : 'default';
  const definitionId = typeof entry.definitionId === 'string' && entry.definitionId
    ? entry.definitionId
    : templateId;

  const acceptedOnDay = clampDay(entry.acceptedOnDay, fallbackDay);
  const deadlineDay = clampDay(entry.deadlineDay, acceptedOnDay);
  const hoursRequired = clampNonNegativeNumber(entry.hoursRequired, 0);
  const metadata = cloneMarketMetadata(entry.metadata);
  const payout = cloneMarketMetadata(entry.payout);
  if (payout.amount != null) {
    payout.amount = clampNonNegativeNumber(payout.amount, 0);
  }
  if (!payout.schedule) {
    payout.schedule = 'onCompletion';
  }

  const payoutAwarded = entry.payoutAwarded != null
    ? clampNonNegativeNumber(entry.payoutAwarded, payout.amount ?? 0)
    : null;
  const payoutPaid = entry.payoutPaid === true;
  const payoutPaidOnDay = entry.payoutPaidOnDay != null
    ? clampDay(entry.payoutPaidOnDay, acceptedOnDay)
    : null;

  const instanceId = typeof entry.instanceId === 'string' && entry.instanceId
    ? entry.instanceId
    : null;
  const seats = clampPositiveInteger(entry.seats, 1);
  const templateCategory = typeof entry.templateCategory === 'string' && entry.templateCategory.trim().length
    ? entry.templateCategory.trim()
    : null;

  const completedOnDay = entry.completedOnDay != null
    ? clampDay(entry.completedOnDay, acceptedOnDay)
    : null;
  const hoursLogged = entry.hoursLogged != null
    ? clampNonNegativeNumber(entry.hoursLogged, hoursRequired)
    : null;
  const completion = typeof entry.completion === 'object' && entry.completion !== null
    ? structuredClone(entry.completion)
    : null;
  if (completion) {
    if (completion.day == null && completedOnDay != null) {
      completion.day = completedOnDay;
    }
    if (completion.hoursLogged == null && hoursLogged != null) {
      completion.hoursLogged = hoursLogged;
    }
  }

  return {
    id: typeof entry.id === 'string' && entry.id ? entry.id : `accepted-${offerId}-${createId()}`,
    offerId,
    templateId,
    definitionId,
    variantId,
    acceptedOnDay,
    deadlineDay,
    hoursRequired,
    instanceId,
    payout,
    payoutAwarded,
    payoutPaid,
    payoutPaidOnDay,
    status: entry.status === 'complete' ? 'complete' : 'active',
    metadata,
    completedOnDay,
    hoursLogged,
    completion: completion || null,
    seats,
    templateCategory
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
    if (acceptedEntry) {
      offer.instanceId = acceptedEntry.instanceId;
      offer.claimedOnDay = acceptedEntry.acceptedOnDay;
      offer.claimDeadlineDay = acceptedEntry.deadlineDay;
      offer.seats = clampPositiveInteger(offer.seats, acceptedEntry.seats ?? offer.seats ?? 1);
      if (acceptedEntry.templateCategory) {
        offer.templateCategory = acceptedEntry.templateCategory;
      }
      if (acceptedEntry.variantId && offer.variantId !== acceptedEntry.variantId) {
        offer.variantId = acceptedEntry.variantId;
      }
      if (acceptedEntry.status === 'complete') {
        offer.claimed = false;
        offer.status = 'complete';
        offer.completedOnDay = acceptedEntry.completedOnDay ?? acceptedEntry.acceptedOnDay;
        offer.completedInstanceId = acceptedEntry.instanceId;
        offer.completionHoursLogged = acceptedEntry.hoursLogged ?? null;
        offer.claimMetadata = cloneMarketMetadata(acceptedEntry.metadata || {});
      } else {
        offer.claimed = true;
        offer.status = 'claimed';
        offer.claimMetadata = cloneMarketMetadata(acceptedEntry.metadata || {});
        delete offer.completedOnDay;
        delete offer.completedInstanceId;
        delete offer.completionHoursLogged;
      }
    } else {
      offer.claimed = false;
      offer.status = 'available';
      offer.claimedOnDay = null;
      offer.instanceId = null;
      delete offer.claimMetadata;
      delete offer.claimDeadlineDay;
      delete offer.completedOnDay;
      delete offer.completedInstanceId;
      delete offer.completionHoursLogged;
    }
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
    variantId: offer.variantId,
    acceptedOnDay: details.acceptedOnDay ?? state.day ?? offer.availableOnDay,
    deadlineDay: details.deadlineDay ?? offer.expiresOnDay,
    hoursRequired: details.hoursRequired ?? offer.metadata?.hoursRequired ?? offer.metadata?.requirements?.hours ?? 0,
    instanceId: details.instanceId ?? offer.instanceId ?? null,
    payout: details.payout ?? offer.metadata?.payout ?? {},
    status: details.status ?? 'active',
    metadata: details.metadata ?? offer.metadata ?? {},
    seats: offer.seats,
    templateCategory: offer.templateCategory
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
  offer.claimMetadata = cloneMarketMetadata(acceptedEntry.metadata || {});
  offer.claimDeadlineDay = acceptedEntry.deadlineDay;
  offer.seats = clampPositiveInteger(offer.seats, acceptedEntry.seats ?? offer.seats ?? 1);
  if (acceptedEntry.templateCategory && !offer.templateCategory) {
    offer.templateCategory = acceptedEntry.templateCategory;
  }

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

  let released = false;
  for (let index = marketState.accepted.length - 1; index >= 0; index -= 1) {
    const entry = marketState.accepted[index];
    if (!entry) continue;

    const matchesOffer = offerId && entry.offerId === offerId;
    const matchesAccepted = acceptedId && entry.id === acceptedId;
    const matchesInstance = instanceId && entry.instanceId === instanceId;

    if (!matchesOffer && !matchesAccepted && !matchesInstance) {
      continue;
    }

    marketState.accepted.splice(index, 1);
    released = true;

    const offer = marketState.offers.find(item => item && item.id === entry.offerId);
    if (offer) {
      offer.claimed = false;
      offer.status = 'available';
      offer.claimedOnDay = null;
      offer.instanceId = null;
      delete offer.claimMetadata;
      delete offer.claimDeadlineDay;
      delete offer.completedOnDay;
      delete offer.completedInstanceId;
      delete offer.completionHoursLogged;
    }
  }

  if (!released) {
    return false;
  }

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
    .map(offer => structuredClone(offer));
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
  return marketState.accepted
    .filter(entry => includeCompleted || entry.status !== 'complete')
    .filter(entry => {
      if (entry.status === 'complete') {
        return includeCompleted;
      }
      return includeExpired || entry.deadlineDay >= fallbackDay;
    })
    .map(entry => structuredClone(entry));
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

  const resolvedCompletionDay = clampDay(completionDay ?? fallbackDay, entry.acceptedOnDay);
  const resolvedHours = hoursLogged != null
    ? clampNonNegativeNumber(hoursLogged, entry.hoursRequired ?? hoursLogged)
    : entry.hoursLogged ?? null;

  entry.status = 'complete';
  entry.completedOnDay = resolvedCompletionDay;
  if (resolvedHours != null) {
    entry.hoursLogged = resolvedHours;
  }
  entry.completed = true;
  entry.completion = {
    ...(typeof entry.completion === 'object' && entry.completion !== null ? structuredClone(entry.completion) : {}),
    day: resolvedCompletionDay,
    hoursLogged: resolvedHours
  };

  const offer = marketState.offers.find(item => item.id === entry.offerId);
  if (offer) {
    offer.status = 'complete';
    offer.claimed = false;
    offer.completedOnDay = resolvedCompletionDay;
    offer.completedInstanceId = entry.instanceId;
    offer.completionHoursLogged = resolvedHours ?? null;
    offer.instanceId = entry.instanceId;
    offer.claimedOnDay = entry.acceptedOnDay;
    offer.claimDeadlineDay = entry.deadlineDay;
    offer.claimMetadata = cloneMarketMetadata(entry.metadata || {});
  }

  ensureHustleMarketState(state, { fallbackDay });

  return marketState.accepted.find(item => item.instanceId === instanceId) || null;
}

export { DEFAULT_STATE as DEFAULT_HUSTLE_MARKET_STATE };

