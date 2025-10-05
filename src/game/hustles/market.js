import { structuredClone, createId } from '../../core/helpers.js';
import { getState } from '../../core/state.js';
import {
  ensureHustleMarketState,
  normalizeHustleMarketOffer
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

function buildOfferMetadata(template, variant) {
  const baseMetadata = typeof template?.market?.metadata === 'object' && template.market.metadata !== null
    ? structuredClone(template.market.metadata)
    : {};
  const variantMetadata = typeof variant?.metadata === 'object' && variant.metadata !== null
    ? structuredClone(variant.metadata)
    : {};
  return {
    ...baseMetadata,
    ...variantMetadata,
    availableAfterDays: variant.availableAfterDays,
    durationDays: variant.durationDays
  };
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

  const offersByTemplate = new Map();
  for (const offer of preservedOffers) {
    if (!offersByTemplate.has(offer.templateId)) {
      offersByTemplate.set(offer.templateId, []);
    }
    offersByTemplate.get(offer.templateId).push(offer);
  }

  for (const template of templates) {
    if (!template || !template.id) continue;
    const templateId = template.id;
    const existingOffers = offersByTemplate.get(templateId);
    if (existingOffers && existingOffers.length) {
      continue;
    }

    const variants = buildVariantPool(template);
    const selectedVariant = selectVariantFromPool(variants, rng);
    if (!selectedVariant) continue;

    const offer = createOfferFromVariant({
      template,
      variant: selectedVariant,
      day: currentDay,
      timestamp: resolvedTimestamp
    });

    preservedOffers.push(structuredClone(offer));
    offersByTemplate.set(templateId, [offer]);
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
  includeUpcoming = false
} = {}) {
  const workingState = state || getState();
  const targetDay = resolveDay(day, workingState?.day || 1);
  const marketState = ensureHustleMarketState(workingState, { fallbackDay: targetDay });

  const filtered = marketState.offers.filter(offer => {
    if (!offer) return false;
    if (includeUpcoming) {
      return offer.expiresOnDay >= targetDay;
    }
    return offer.availableOnDay <= targetDay && offer.expiresOnDay >= targetDay;
  });

  return filtered.map(offer => structuredClone(offer));
}

