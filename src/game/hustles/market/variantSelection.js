import {
  clampMarketDaySpan,
  clampMarketPositiveInteger,
  clampMarketWeight,
  cloneMarketMetadata
} from '../normalizers.js';

function buildVariantTemplate(template) {
  const marketConfig = template?.market || {};
  const baseDuration = clampMarketDaySpan(marketConfig.durationDays ?? 0, 0);
  const baseOffset = clampMarketDaySpan(
    marketConfig.availableAfterDays ?? marketConfig.startOffsetDays ?? 0,
    0
  );
  const templateSeats = clampMarketPositiveInteger(marketConfig.seats ?? 1, 1);
  return {
    id: 'default',
    label: template?.name || template?.id || 'Hustle',
    description: template?.description ?? null,
    definitionId: template?.id,
    weight: 1,
    durationDays: Math.max(0, baseDuration),
    availableAfterDays: Math.max(0, baseOffset),
    metadata: {},
    copies: 1,
    maxActive: 1,
    seats: templateSeats
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
  const weight = clampMarketWeight(entry.weight, fallback.weight);
  const duration = clampMarketDaySpan(
    entry.durationDays ?? fallback.durationDays,
    fallback.durationDays
  );
  const offset = clampMarketDaySpan(
    entry.availableAfterDays ?? entry.startOffsetDays ?? fallback.availableAfterDays,
    fallback.availableAfterDays
  );
  const metadata = cloneMarketMetadata(entry.metadata);
  const copies = clampMarketPositiveInteger(entry.copies ?? fallback.copies ?? 1, fallback.copies ?? 1);
  const maxActive = entry.maxActive != null
    ? clampMarketPositiveInteger(entry.maxActive, copies)
    : Math.max(1, copies);
  const seats = entry.seats != null
    ? clampMarketPositiveInteger(entry.seats, fallback.seats ?? 1)
    : clampMarketPositiveInteger(fallback.seats ?? 1, 1);

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
    metadata,
    copies,
    maxActive,
    seats
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

export {
  buildVariantPool,
  selectVariantFromPool
};
