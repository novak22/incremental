import { structuredClone, createId } from '../../core/helpers.js';
import { getState } from '../../core/state.js';
import {
  ensureHustleMarketState,
  normalizeHustleMarketOffer,
  getMarketAvailableOffers,
  getMarketClaimedOffers
} from '../../core/state/slices/hustleMarket.js';

function resolveDay(value, fallback = 1) {
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

function resolveNonNegative(value, fallback = 0) {
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

function resolveWeight(value, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function buildVariantTemplate(template) {
  const marketConfig = template?.market || {};
  const baseDuration = resolveNonNegative(marketConfig.durationDays ?? 0, 0);
  const baseOffset = resolveNonNegative(
    marketConfig.availableAfterDays ?? marketConfig.startOffsetDays ?? 0,
    0
  );
  return {
    id: 'default',
    label: template?.name || template?.id || 'Hustle',
    description: template?.description ?? null,
    definitionId: template?.id,
    weight: 1,
    durationDays: Math.max(0, baseDuration),
    availableAfterDays: Math.max(0, baseOffset),
    metadata: {}
  };
}

function normalizeVariant(entry, index, template) {
  const fallback = buildVariantTemplate(template);

  if (!entry) {
    return { ...fallback, id: `variant-${index}` };
  }

  if (typeof entry === 'string') {
    return {
      ...fallback,
      id: entry,
      definitionId: entry
    };
  }

  if (typeof entry !== 'object') {
    return { ...fallback, id: `variant-${index}` };
  }

  const variantId = typeof entry.id === 'string' && entry.id
    ? entry.id
    : `variant-${index}`;
  const weight = resolveWeight(entry.weight, fallback.weight);
  const duration = resolveNonNegative(
    entry.durationDays ?? fallback.durationDays,
    fallback.durationDays
  );
  const offset = resolveNonNegative(
    entry.availableAfterDays ?? entry.startOffsetDays ?? fallback.availableAfterDays,
    fallback.availableAfterDays
  );
  const metadata = typeof entry.metadata === 'object' && entry.metadata !== null
    ? structuredClone(entry.metadata)
    : {};

  return {
    id: variantId,
    label: typeof entry.label === 'string' && entry.label ? entry.label : (template?.name || variantId),
    description: entry.description != null ? String(entry.description) : (template?.description ?? null),
    definitionId: typeof entry.definitionId === 'string' && entry.definitionId
      ? entry.definitionId
      : template?.id,
    weight,
    durationDays: Math.max(0, duration),
    availableAfterDays: Math.max(0, offset),
    metadata
  };
}

function buildVariantPool(template) {
  const marketConfig = template?.market || {};
  const rawVariants = Array.isArray(marketConfig.variants) ? marketConfig.variants : [];
  if (!rawVariants.length) {
    return [buildVariantTemplate(template)];
  }
  return rawVariants.map((entry, index) => normalizeVariant(entry, index, template));
}

function selectVariantFromPool(variants, rng = Math.random) {
  if (!variants.length) return null;
  if (variants.length === 1) return variants[0];

  const weights = variants.map(variant => Math.max(0, Number(variant.weight) || 0));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    return variants[0];
  }

  const rollSource = typeof rng === 'function' ? rng() : Math.random();
  const bounded = Math.min(Math.max(Number(rollSource) || 0, 0), 0.9999999999);
  const target = bounded * totalWeight;

  let cumulative = 0;
  for (let index = 0; index < variants.length; index += 1) {
    cumulative += weights[index];
    if (target < cumulative) {
      return variants[index];
    }
  }
  return variants[variants.length - 1];
}

function resolveFirstNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

function resolveFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length) {
      return value.trim();
    }
  }
  return null;
}

function buildOfferMetadata(template, variant) {
  const baseMetadata = typeof template?.market?.metadata === 'object' && template.market.metadata !== null
    ? structuredClone(template.market.metadata)
    : {};
  const variantMetadata = typeof variant?.metadata === 'object' && variant.metadata !== null
    ? structuredClone(variant.metadata)
    : {};

  const requirements = {
    ...(typeof baseMetadata.requirements === 'object' && baseMetadata.requirements !== null
      ? structuredClone(baseMetadata.requirements)
      : {}),
    ...(typeof variantMetadata.requirements === 'object' && variantMetadata.requirements !== null
      ? structuredClone(variantMetadata.requirements)
      : {})
  };

  const resolvedHours = resolveFirstNumber(
    requirements.hours,
    requirements.timeHours,
    variantMetadata.timeHours,
    variantMetadata.hours,
    baseMetadata.timeHours,
    template?.time,
    template?.action?.timeCost
  );
  if (resolvedHours != null) {
    requirements.hours = resolvedHours;
  }

  const payout = {
    ...(typeof baseMetadata.payout === 'object' && baseMetadata.payout !== null
      ? structuredClone(baseMetadata.payout)
      : {}),
    ...(typeof variantMetadata.payout === 'object' && variantMetadata.payout !== null
      ? structuredClone(variantMetadata.payout)
      : {})
  };

  const resolvedPayoutAmount = resolveFirstNumber(
    payout.amount,
    variantMetadata.payoutAmount,
    baseMetadata.payoutAmount,
    template?.payout?.amount
  );
  if (resolvedPayoutAmount != null) {
    payout.amount = resolvedPayoutAmount;
  }

  const resolvedSchedule = resolveFirstString(
    payout.schedule,
    variantMetadata.payoutSchedule,
    baseMetadata.payoutSchedule
  ) || 'onCompletion';
  payout.schedule = resolvedSchedule;

  const metadata = {
    ...baseMetadata,
    ...variantMetadata,
    requirements,
    payout,
    availableAfterDays: variant.availableAfterDays,
    durationDays: variant.durationDays
  };

  if (resolvedHours != null) {
    metadata.hoursRequired = resolvedHours;
  }
  if (resolvedPayoutAmount != null) {
    metadata.payoutAmount = resolvedPayoutAmount;
  }
  metadata.payoutSchedule = resolvedSchedule;

  return metadata;
}

function createOfferFromVariant({ template, variant, day, timestamp }) {
  const availableOnDay = resolveDay(day, 1) + resolveNonNegative(variant.availableAfterDays || 0, 0);
  const expiresOnDay = availableOnDay + resolveNonNegative(variant.durationDays || 0, 0);
  const rawOffer = {
    id: `offer-${variant.definitionId || template.id}-${variant.id}-${createId()}`,
    templateId: template.id,
    variantId: variant.id,
    definitionId: variant.definitionId || template.id,
    rolledOnDay: resolveDay(day, 1),
    rolledAt: Number(timestamp) || Date.now(),
    availableOnDay,
    expiresOnDay,
    metadata: buildOfferMetadata(template, variant),
    variant: {
      id: variant.id,
      label: variant.label,
      description: variant.description ?? null
    }
  };

  return normalizeHustleMarketOffer(rawOffer, {
    fallbackTimestamp: rawOffer.rolledAt,
    fallbackDay: day
  });
}

function isOfferActiveOnOrAfterDay(offer, day) {
  if (!offer) return false;
  const parsedDay = resolveDay(day, 1);
  return offer.expiresOnDay >= parsedDay;
}

export function rollDailyOffers({
  templates = [],
  day,
  now,
  state = getState(),
  rng = Math.random
} = {}) {
  const workingState = state || getState();
  const currentDay = resolveDay(day, workingState?.day || 1);
  const timestamp = Number(now);
  const resolvedTimestamp = Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : Date.now();

  const marketState = ensureHustleMarketState(workingState, { fallbackDay: currentDay });

  const preservedOffers = marketState.offers
    .filter(offer => isOfferActiveOnOrAfterDay(offer, currentDay))
    .map(offer => structuredClone(offer));

  const activeVariantsByTemplate = new Map();
  for (const offer of preservedOffers) {
    if (!offer || offer.claimed) continue;
    if (!activeVariantsByTemplate.has(offer.templateId)) {
      activeVariantsByTemplate.set(offer.templateId, new Set());
    }
    activeVariantsByTemplate.get(offer.templateId).add(offer.variantId);
  }

  for (const template of templates) {
    if (!template || !template.id) continue;
    const templateId = template.id;

    const variants = buildVariantPool(template);
    if (!variants.length) continue;

    const activeVariantSet = activeVariantsByTemplate.get(templateId) || new Set();
    const unclaimedVariants = variants.filter(variant => !activeVariantSet.has(variant.id));
    if (!unclaimedVariants.length) {
      continue;
    }

    const selectedVariant = selectVariantFromPool(unclaimedVariants, rng);
    if (!selectedVariant) continue;

    const offer = createOfferFromVariant({
      template,
      variant: selectedVariant,
      day: currentDay,
      timestamp: resolvedTimestamp
    });

    preservedOffers.push(structuredClone(offer));
    if (!activeVariantsByTemplate.has(templateId)) {
      activeVariantsByTemplate.set(templateId, new Set());
    }
    activeVariantsByTemplate.get(templateId).add(selectedVariant.id);
  }

  preservedOffers.sort((a, b) => {
    if (a.availableOnDay === b.availableOnDay) {
      if (a.templateId === b.templateId) {
        return a.variantId.localeCompare(b.variantId);
      }
      return a.templateId.localeCompare(b.templateId);
    }
    return a.availableOnDay - b.availableOnDay;
  });

  marketState.offers = preservedOffers.map(offer => normalizeHustleMarketOffer(offer, {
    fallbackTimestamp: resolvedTimestamp,
    fallbackDay: currentDay
  }));
  marketState.lastRolledAt = resolvedTimestamp;
  marketState.lastRolledOnDay = currentDay;

  return marketState.offers.map(offer => structuredClone(offer));
}

export function getAvailableOffers(state = getState(), {
  day,
  includeUpcoming = false,
  includeClaimed = false
} = {}) {
  const workingState = state || getState();
  const targetDay = resolveDay(day, workingState?.day || 1);
  return getMarketAvailableOffers(workingState, {
    day: targetDay,
    includeUpcoming,
    includeClaimed
  });
}

export function getClaimedOffers(state = getState(), {
  day,
  includeExpired = false
} = {}) {
  const workingState = state || getState();
  const targetDay = resolveDay(day, workingState?.day || 1);
  return getMarketClaimedOffers(workingState, {
    day: targetDay,
    includeExpired
  });
}

