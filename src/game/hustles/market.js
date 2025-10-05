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

function resolvePositiveInteger(value, fallback = 1) {
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
    metadata: {},
    copies: 1,
    maxActive: 1
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
  const copies = resolvePositiveInteger(entry.copies ?? fallback.copies ?? 1, fallback.copies ?? 1);
  const maxActive = entry.maxActive != null
    ? resolvePositiveInteger(entry.maxActive, copies)
    : Math.max(1, copies);

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
    maxActive
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
      activeVariantsByTemplate.set(offer.templateId, {
        total: 0,
        variants: new Map()
      });
    }
    const activity = activeVariantsByTemplate.get(offer.templateId);
    activity.total += 1;
    activity.variants.set(
      offer.variantId,
      (activity.variants.get(offer.variantId) || 0) + 1
    );
  }

  for (const template of templates) {
    if (!template || !template.id) continue;
    const templateId = template.id;

    const variants = buildVariantPool(template);
    if (!variants.length) continue;

    const marketConfig = template?.market || {};
    const templateSlotsPerRoll = resolvePositiveInteger(marketConfig.slotsPerRoll ?? 1, 1);
    const defaultTemplateMaxActive = Math.max(templateSlotsPerRoll, variants.length);
    const templateMaxActive = resolvePositiveInteger(
      marketConfig.maxActive != null ? marketConfig.maxActive : defaultTemplateMaxActive,
      defaultTemplateMaxActive
    );

    if (!activeVariantsByTemplate.has(templateId)) {
      activeVariantsByTemplate.set(templateId, {
        total: 0,
        variants: new Map()
      });
    }

    const activity = activeVariantsByTemplate.get(templateId);
    const currentActive = activity.total;
    const templateCapacity = Math.max(0, templateMaxActive - currentActive);
    let slotsRemaining = Math.min(templateSlotsPerRoll, templateCapacity);
    if (slotsRemaining <= 0) {
      continue;
    }

    const pendingAdds = new Map();

    while (slotsRemaining > 0) {
      const availableVariants = variants.filter(variant => {
        const activeCount = activity.variants.get(variant.id) || 0;
        const pendingCount = pendingAdds.get(variant.id) || 0;
        const variantMaxActive = resolvePositiveInteger(
          variant.maxActive != null ? variant.maxActive : variant.copies ?? 1,
          variant.copies ?? 1
        );
        const capacity = variantMaxActive - activeCount - pendingCount;
        return capacity > 0;
      });

      if (!availableVariants.length) {
        break;
      }

      const selectedVariant = selectVariantFromPool(availableVariants, rng);
      if (!selectedVariant) {
        break;
      }

      const activeCount = activity.variants.get(selectedVariant.id) || 0;
      const pendingCount = pendingAdds.get(selectedVariant.id) || 0;
      const variantMaxActive = resolvePositiveInteger(
        selectedVariant.maxActive != null ? selectedVariant.maxActive : selectedVariant.copies ?? 1,
        selectedVariant.copies ?? 1
      );
      const variantCapacity = Math.max(0, variantMaxActive - activeCount - pendingCount);
      if (variantCapacity <= 0) {
        pendingAdds.set(selectedVariant.id, pendingCount);
        continue;
      }

      const variantCopies = resolvePositiveInteger(selectedVariant.copies ?? 1, 1);
      const spawnCount = Math.min(variantCopies, variantCapacity, slotsRemaining);
      if (spawnCount <= 0) {
        pendingAdds.set(selectedVariant.id, pendingCount);
        break;
      }

      for (let index = 0; index < spawnCount; index += 1) {
        const offer = createOfferFromVariant({
          template,
          variant: selectedVariant,
          day: currentDay,
          timestamp: resolvedTimestamp
        });
        preservedOffers.push(structuredClone(offer));
      }

      activity.total += spawnCount;
      activity.variants.set(
        selectedVariant.id,
        (activity.variants.get(selectedVariant.id) || 0) + spawnCount
      );
      pendingAdds.set(selectedVariant.id, pendingCount + spawnCount);
      slotsRemaining -= spawnCount;
    }
  }

  preservedOffers.sort((a, b) => {
    if (a.availableOnDay === b.availableOnDay) {
      if (a.templateId === b.templateId) {
        if (a.variantId === b.variantId) {
          return a.id.localeCompare(b.id);
        }
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
  includeExpired = false,
  includeCompleted = false
} = {}) {
  const workingState = state || getState();
  const targetDay = resolveDay(day, workingState?.day || 1);
  return getMarketClaimedOffers(workingState, {
    day: targetDay,
    includeExpired,
    includeCompleted
  });
}

