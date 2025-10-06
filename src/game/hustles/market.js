import { structuredClone, createId } from '../../core/helpers.js';
import { getState } from '../../core/state.js';
import {
  ensureHustleMarketState,
  normalizeHustleMarketOffer,
  getMarketAvailableOffers,
  getMarketClaimedOffers
} from '../../core/state/slices/hustleMarket.js';

const MAX_AUDIT_ENTRIES = 30;
const MARKET_ROLL_AUDIT = [];

function cloneTemplateAuditEntries(entries = []) {
  return entries.map(entry => ({
    templateId: entry.templateId,
    slotsRequested: entry.slotsRequested,
    existingActive: entry.existingActive,
    added: entry.added,
    skipped: entry.skipped,
    reason: entry.reason
  }));
}

function recordMarketRollAudit({ day, timestamp, preserved, created, templates }) {
  const templateSummaries = cloneTemplateAuditEntries(templates);
  const entry = {
    day,
    timestamp,
    preservedOffers: preserved,
    createdOffers: created,
    totalOffers: preserved + created,
    templates: templateSummaries,
    skippedTemplates: templateSummaries.filter(item => item.skipped).map(item => item.templateId)
  };

  MARKET_ROLL_AUDIT.push(entry);
  if (MARKET_ROLL_AUDIT.length > MAX_AUDIT_ENTRIES) {
    MARKET_ROLL_AUDIT.shift();
  }

  if (typeof globalThis !== 'undefined') {
    const globalLog = globalThis.__HUSTLE_MARKET_AUDIT__ = globalThis.__HUSTLE_MARKET_AUDIT__ || [];
    globalLog.push(entry);
    if (globalLog.length > MAX_AUDIT_ENTRIES) {
      globalLog.shift();
    }
  }

  if (typeof process === 'undefined' && typeof window !== 'undefined' && typeof console !== 'undefined') {
    const label = `[HustleMarket] Day ${day} roll → ${created} new / ${preserved} preserved`;
    if (typeof console.groupCollapsed === 'function' && typeof console.table === 'function') {
      console.groupCollapsed(label);
      console.table(templateSummaries.map(summary => ({
        template: summary.templateId,
        requested: summary.slotsRequested,
        existing: summary.existingActive,
        added: summary.added,
        skipped: summary.skipped,
        reason: summary.reason || ''
      })));
      console.groupEnd();
    } else if (typeof console.info === 'function') {
      console.info(label);
    }
  }
}

export function getMarketRollAuditLog() {
  return MARKET_ROLL_AUDIT.map(entry => ({
    ...entry,
    templates: cloneTemplateAuditEntries(entry.templates),
    skippedTemplates: [...entry.skippedTemplates]
  }));
}

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
  const templateSeats = resolvePositiveInteger(marketConfig.seats ?? 1, 1);
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
  const seats = entry.seats != null
    ? resolvePositiveInteger(entry.seats, fallback.seats ?? 1)
    : resolvePositiveInteger(fallback.seats ?? 1, 1);

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

  const baseProgress = typeof baseMetadata.progress === 'object' && baseMetadata.progress !== null
    ? structuredClone(baseMetadata.progress)
    : {};
  const variantProgress = typeof variantMetadata.progress === 'object' && variantMetadata.progress !== null
    ? structuredClone(variantMetadata.progress)
    : {};

  const progress = {
    ...baseProgress,
    ...variantProgress
  };

  const resolvedHoursPerDay = resolveFirstNumber(
    variantMetadata.hoursPerDay,
    variantProgress.hoursPerDay,
    baseMetadata.hoursPerDay,
    baseProgress.hoursPerDay,
    template?.progress?.hoursPerDay
  );
  if (resolvedHoursPerDay != null && resolvedHoursPerDay > 0) {
    const normalized = Math.max(0, Number(resolvedHoursPerDay));
    progress.hoursPerDay = normalized;
    metadata.hoursPerDay = normalized;
  } else {
    delete progress.hoursPerDay;
    delete metadata.hoursPerDay;
  }

  const resolvedDaysRequired = resolveFirstNumber(
    variantMetadata.daysRequired,
    variantProgress.daysRequired,
    baseMetadata.daysRequired,
    baseProgress.daysRequired,
    template?.progress?.daysRequired
  );
  if (resolvedDaysRequired != null && resolvedDaysRequired > 0) {
    const normalized = Math.max(1, Math.floor(resolvedDaysRequired));
    progress.daysRequired = normalized;
    metadata.daysRequired = normalized;
  } else {
    delete progress.daysRequired;
    delete metadata.daysRequired;
  }

  const resolvedCompletion = resolveFirstString(
    variantMetadata.completionMode,
    variantMetadata.completion,
    variantProgress.completionMode,
    variantProgress.completion,
    baseMetadata.completionMode,
    baseProgress.completionMode,
    baseProgress.completion,
    template?.progress?.completionMode,
    template?.progress?.completion
  );
  if (resolvedCompletion) {
    progress.completion = resolvedCompletion;
    progress.completionMode = resolvedCompletion;
    metadata.completionMode = resolvedCompletion;
  } else {
    delete progress.completionMode;
    delete progress.completion;
    delete metadata.completionMode;
  }

  const resolvedProgressLabel = resolveFirstString(
    variantMetadata.progressLabel,
    variantProgress.label,
    variantProgress.progressLabel,
    baseMetadata.progressLabel,
    baseProgress.label,
    template?.progress?.label
  );
  if (resolvedProgressLabel) {
    progress.label = resolvedProgressLabel;
    metadata.progressLabel = resolvedProgressLabel;
  } else {
    delete progress.label;
    delete metadata.progressLabel;
  }

  if (Object.keys(progress).length) {
    metadata.progress = progress;
  }

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
  const templateCategory = typeof template?.market?.category === 'string' && template.market.category
    ? template.market.category
    : (typeof template?.market?.templateCategory === 'string' && template.market.templateCategory
      ? template.market.templateCategory
      : null);
  const defaultSeats = resolvePositiveInteger(template?.market?.seats ?? variant.seats ?? 1, 1);
  const variantSeats = resolvePositiveInteger(variant.seats ?? defaultSeats, defaultSeats);
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
      description: variant.description ?? null,
      seats: variantSeats
    },
    templateCategory,
    seats: variantSeats
  };

  if (rawOffer.metadata && typeof rawOffer.metadata === 'object') {
    rawOffer.metadata.seats = variantSeats;
    if (templateCategory) {
      rawOffer.metadata.templateCategory = templateCategory;
    }
  }

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
  const templateAudits = [];
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

    if (!activeVariantsByTemplate.has(templateId)) {
      activeVariantsByTemplate.set(templateId, {
        total: 0,
        variants: new Map()
      });
    }

    const activity = activeVariantsByTemplate.get(templateId);
    const existingActive = activity.total;
    const variants = buildVariantPool(template);
    const marketConfig = template?.market || {};
    const templateSlotsPerRoll = resolvePositiveInteger(marketConfig.slotsPerRoll ?? 1, 1);
    const defaultTemplateMaxActive = Math.max(templateSlotsPerRoll, variants.length);
    const templateMaxActive = resolvePositiveInteger(
      marketConfig.maxActive != null ? marketConfig.maxActive : defaultTemplateMaxActive,
      defaultTemplateMaxActive
    );

    const templateAudit = {
      templateId,
      slotsRequested: templateSlotsPerRoll,
      existingActive,
      added: 0,
      skipped: false,
      reason: null
    };
    templateAudits.push(templateAudit);

    if (!variants.length) {
      templateAudit.skipped = true;
      templateAudit.reason = 'noVariants';
      continue;
    }

    const currentActive = activity.total;
    const templateCapacity = Math.max(0, templateMaxActive - currentActive);
    let slotsRemaining = Math.min(templateSlotsPerRoll, templateCapacity);
    if (slotsRemaining <= 0) {
      templateAudit.skipped = true;
      templateAudit.reason = 'maxActiveReached';
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
        templateAudit.reason = templateAudit.reason || 'variantCapacityReached';
        break;
      }

      const selectedVariant = selectVariantFromPool(availableVariants, rng);
      if (!selectedVariant) {
        templateAudit.reason = templateAudit.reason || 'selectionFailed';
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
        templateAudit.reason = templateAudit.reason || 'variantCapacityReached';
        continue;
      }

      const variantCopies = resolvePositiveInteger(selectedVariant.copies ?? 1, 1);
      const spawnCount = Math.min(variantCopies, variantCapacity, slotsRemaining);
      if (spawnCount <= 0) {
        pendingAdds.set(selectedVariant.id, pendingCount);
        templateAudit.reason = templateAudit.reason || 'noCapacity';
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
        templateAudit.added += 1;
      }

      pendingAdds.set(selectedVariant.id, pendingCount + spawnCount);
      slotsRemaining -= spawnCount;
    }

    if (pendingAdds.size > 0) {
      let addedToTemplate = 0;
      for (const [variantId, addedCount] of pendingAdds.entries()) {
        if (addedCount <= 0) continue;
        addedToTemplate += addedCount;
        activity.variants.set(
          variantId,
          (activity.variants.get(variantId) || 0) + addedCount
        );
      }
      if (addedToTemplate > 0) {
        activity.total += addedToTemplate;
      }
    }

    if (templateAudit.added === 0) {
      templateAudit.skipped = true;
      if (!templateAudit.reason) {
        templateAudit.reason = 'noOffersSpawned';
      }
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

  const newOffersCount = marketState.offers.filter(offer => offer.rolledOnDay === currentDay).length;
  const preservedCount = marketState.offers.length - newOffersCount;
  recordMarketRollAudit({
    day: currentDay,
    timestamp: resolvedTimestamp,
    preserved: preservedCount,
    created: newOffersCount,
    templates: templateAudits
  });

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

function attachHustleMarketDebugTools() {
  if (typeof globalThis === 'undefined') {
    return;
  }

  const namespace = globalThis.__HUSTLE_MARKET_DEBUG__ = globalThis.__HUSTLE_MARKET_DEBUG__ || {};
  namespace.getAuditLog = () => getMarketRollAuditLog();
  namespace.printAuditLog = () => {
    const audit = getMarketRollAuditLog();
    if (typeof console !== 'undefined') {
      if (typeof console.table === 'function') {
        console.table(audit.map(entry => ({
          day: entry.day,
          created: entry.createdOffers,
          preserved: entry.preservedOffers,
          skipped: entry.skippedTemplates.join(', ')
        })));
      } else if (typeof console.log === 'function') {
        console.log(audit);
      }
    }
    return audit;
  };
  namespace.printOffers = () => {
    const state = getState();
    const day = state?.day || 1;
    const offers = getMarketAvailableOffers(state, {
      day,
      includeUpcoming: true,
      includeClaimed: true
    });
    if (typeof console !== 'undefined') {
      if (typeof console.table === 'function') {
        console.table(offers.map(offer => ({
          template: offer.templateId,
          variant: offer.variant?.label || offer.variantId,
          available: offer.availableOnDay,
          expires: offer.expiresOnDay,
          claimed: offer.claimed ? 'yes' : 'no',
          payout: offer.metadata?.payout?.amount ?? offer.metadata?.payoutAmount ?? null
        })));
      } else if (typeof console.log === 'function') {
        console.log(offers);
      }
    }
    return offers;
  };
}

attachHustleMarketDebugTools();

