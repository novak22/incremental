import { structuredClone, createId } from '../../../helpers.js';
import {
  clampMarketDay as clampDay,
  clampMarketNonNegativeNumber as clampNonNegativeNumber,
  clampMarketPositiveInteger as clampPositiveInteger,
  cloneMarketMetadata
} from '../../../../game/hustles/normalizers.js';

export function normalizeAcceptedOffer(entry, { fallbackDay = 1 } = {}) {
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

export function createAcceptedEntryFromOffer(offer, details = {}, fallbackDay = 1) {
  if (!offer) {
    return null;
  }

  return normalizeAcceptedOffer({
    offerId: offer.id,
    templateId: offer.templateId,
    definitionId: offer.definitionId,
    variantId: offer.variantId,
    acceptedOnDay: details.acceptedOnDay ?? offer.availableOnDay,
    deadlineDay: details.deadlineDay ?? offer.expiresOnDay,
    hoursRequired: details.hoursRequired ?? offer.metadata?.hoursRequired ?? offer.metadata?.requirements?.hours ?? 0,
    instanceId: details.instanceId ?? offer.instanceId ?? null,
    payout: details.payout ?? offer.metadata?.payout ?? {},
    status: details.status ?? 'active',
    metadata: details.metadata ?? offer.metadata ?? {},
    seats: offer.seats,
    templateCategory: offer.templateCategory
  }, { fallbackDay });
}

export function matchesAcceptedIdentifiers(entry, identifiers = {}) {
  if (!entry) {
    return false;
  }
  const { offerId, acceptedId, instanceId } = identifiers;
  return Boolean(
    (offerId && entry.offerId === offerId)
    || (acceptedId && entry.id === acceptedId)
    || (instanceId && entry.instanceId === instanceId)
  );
}

export function removeAcceptedEntries(marketState, identifiers = {}) {
  if (!marketState || !Array.isArray(marketState.accepted)) {
    return [];
  }

  const removed = [];
  for (let index = marketState.accepted.length - 1; index >= 0; index -= 1) {
    const entry = marketState.accepted[index];
    if (!matchesAcceptedIdentifiers(entry, identifiers)) {
      continue;
    }
    removed.push(entry);
    marketState.accepted.splice(index, 1);
  }
  return removed;
}

export function getClaimedEntries(marketState, fallbackDay, {
  includeExpired = false,
  includeCompleted = false
} = {}) {
  if (!marketState || !Array.isArray(marketState.accepted)) {
    return [];
  }

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

export function completeAcceptedEntry(entry, {
  completionDay,
  hoursLogged,
  fallbackDay
} = {}) {
  if (!entry) {
    return null;
  }

  const resolvedFallbackDay = clampDay(fallbackDay ?? entry.acceptedOnDay ?? 1, 1);
  const resolvedCompletionDay = clampDay(completionDay ?? resolvedFallbackDay, entry.acceptedOnDay);
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

  return entry;
}
