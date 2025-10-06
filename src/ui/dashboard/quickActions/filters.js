function toFiniteNumber(value, fallback = Infinity) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function sortOffersByExpiry(offers = []) {
  return (Array.isArray(offers) ? offers : []).slice().sort((a, b) => {
    const expiresA = toFiniteNumber(a?.expiresOnDay);
    const expiresB = toFiniteNumber(b?.expiresOnDay);
    if (expiresA !== expiresB) {
      return expiresA - expiresB;
    }
    const availableA = toFiniteNumber(a?.availableOnDay, Infinity);
    const availableB = toFiniteNumber(b?.availableOnDay, Infinity);
    if (availableA !== availableB) {
      return availableA - availableB;
    }
    return toFiniteNumber(a?.rolledOnDay, 0) - toFiniteNumber(b?.rolledOnDay, 0);
  });
}

function sortAvailableOffers(offers = []) {
  return (Array.isArray(offers) ? offers : []).slice().sort((a, b) => {
    const expiresA = toFiniteNumber(a?.expiresOnDay);
    const expiresB = toFiniteNumber(b?.expiresOnDay);
    if (expiresA !== expiresB) {
      return expiresA - expiresB;
    }
    return toFiniteNumber(a?.rolledOnDay, 0) - toFiniteNumber(b?.rolledOnDay, 0);
  });
}

function filterAvailableToday(offers = [], currentDay = 1) {
  return (Array.isArray(offers) ? offers : []).filter(candidate => {
    const availableDay = Number(candidate?.availableOnDay) || 0;
    return availableDay <= currentDay;
  });
}

export function selectGroupOffers(group = {}, currentDay = 1) {
  const offers = Array.isArray(group?.offers) ? group.offers : [];
  const availableOffers = sortAvailableOffers(filterAvailableToday(offers, currentDay));
  const fallbackOffers = sortOffersByExpiry(offers);
  const primaryOffer = availableOffers[0] || fallbackOffers[0] || null;
  return {
    primaryOffer,
    availableOffers,
    fallbackOffers
  };
}

export function sortQuickActions(entries = []) {
  return (Array.isArray(entries) ? entries : []).slice().sort((a, b) => {
    const daysA = Number.isFinite(a?.remainingDays) ? a.remainingDays : Infinity;
    const daysB = Number.isFinite(b?.remainingDays) ? b.remainingDays : Infinity;
    if (daysA !== daysB) {
      return daysA - daysB;
    }
    if ((b?.roi ?? 0) !== (a?.roi ?? 0)) {
      return (b?.roi ?? 0) - (a?.roi ?? 0);
    }
    const labelA = a?.label || '';
    const labelB = b?.label || '';
    return labelA.localeCompare(labelB);
  });
}

export function ensureQuickActionEntries(entries = [], { fallbackFactory } = {}) {
  const normalized = Array.isArray(entries) ? entries : [];
  if (normalized.length > 0) {
    return normalized;
  }
  if (typeof fallbackFactory !== 'function') {
    return normalized;
  }
  const fallback = fallbackFactory();
  if (!fallback) {
    return normalized;
  }
  return [fallback];
}
