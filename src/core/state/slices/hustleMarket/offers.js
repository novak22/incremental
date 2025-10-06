import { structuredClone, createId } from '../../../helpers.js';
import {
  clampMarketDay as clampDay,
  clampMarketPositiveInteger as clampPositiveInteger,
  cloneMarketMetadata
} from '../../../../game/hustles/normalizers.js';

function buildDaysActive(startDay, endDay) {
  const start = clampDay(startDay, 1);
  const end = clampDay(endDay, start);
  const days = [];
  for (let day = start; day <= end; day += 1) {
    days.push(day);
  }
  return days;
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

export function decorateOfferWithAccepted(offer, acceptedEntry) {
  if (!offer) {
    return;
  }

  if (!acceptedEntry) {
    offer.claimed = false;
    offer.status = 'available';
    offer.claimedOnDay = null;
    offer.instanceId = null;
    delete offer.claimMetadata;
    delete offer.claimDeadlineDay;
    delete offer.completedOnDay;
    delete offer.completedInstanceId;
    delete offer.completionHoursLogged;
    offer.seats = clampPositiveInteger(offer.seats, 1);
    return;
  }

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
}

export function cloneOffer(offer) {
  return structuredClone(offer);
}
