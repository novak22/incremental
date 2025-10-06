import { structuredClone, createId } from '../../core/helpers.js';
import {
  clampMarketDay,
  clampMarketDaySpan,
  clampMarketPositiveInteger,
  clampMarketWeight,
  cloneMarketMetadata
} from './normalizers.js';
import { getState } from '../../core/state.js';
import {
  ensureHustleMarketState,
  normalizeHustleMarketOffer,
  getMarketAvailableOffers,
  getMarketClaimedOffers
} from '../../core/state/slices/hustleMarket.js';
import {
  resolveFirstNumber,
  resolveFirstString,
  resolveOfferHoursFromMetadata,
  resolveOfferPayoutAmountFromMetadata,
  resolveOfferPayoutScheduleFromMetadata
} from './offerUtils.js';

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

function buildOfferMetadata(template, variant) {
  const baseMetadata = cloneMarketMetadata(template?.market?.metadata);
  const variantMetadata = cloneMarketMetadata(variant?.metadata);

  const requirements = {
    ...cloneMarketMetadata(baseMetadata.requirements),
    ...cloneMarketMetadata(variantMetadata.requirements)
  };

  const resolvedHours = resolveOfferHoursFromMetadata([
    { ...variantMetadata, requirements },
    baseMetadata
  ], template, [variantMetadata.timeHours, variantMetadata.hours, baseMetadata.timeHours]);
  if (resolvedHours != null) {
    requirements.hours = resolvedHours;
  }

  const basePayout = cloneMarketMetadata(baseMetadata.payout);
  const variantPayout = cloneMarketMetadata(variantMetadata.payout);
  const payout = {
    ...basePayout,
    ...variantPayout
  };

  const resolvedPayoutAmount = resolveOfferPayoutAmountFromMetadata(
    [
      { ...variantMetadata, payout },
      variantMetadata,
      baseMetadata
    ],
    template
  );
  if (resolvedPayoutAmount != null) {
    payout.amount = resolvedPayoutAmount;
  }

  const resolvedSchedule = resolveOfferPayoutScheduleFromMetadata(
    [
      { ...variantMetadata, payout },
      variantMetadata,
      baseMetadata
    ],
    'onCompletion'
  );
  payout.schedule = resolvedSchedule;

  const metadata = {
    ...baseMetadata,
    ...variantMetadata,
    requirements,
    payout,
    availableAfterDays: variant.availableAfterDays,
    durationDays: variant.durationDays
  };

  const baseProgress = cloneMarketMetadata(baseMetadata.progress);
  const variantProgress = cloneMarketMetadata(variantMetadata.progress);

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
  const availableOnDay = clampMarketDay(day, 1) + clampMarketDaySpan(variant.availableAfterDays || 0, 0);
  const expiresOnDay = availableOnDay + clampMarketDaySpan(variant.durationDays || 0, 0);
  const templateCategory = typeof template?.market?.category === 'string' && template.market.category
    ? template.market.category
    : (typeof template?.market?.templateCategory === 'string' && template.market.templateCategory
      ? template.market.templateCategory
      : null);
  const defaultSeats = clampMarketPositiveInteger(template?.market?.seats ?? variant.seats ?? 1, 1);
  const variantSeats = clampMarketPositiveInteger(variant.seats ?? defaultSeats, defaultSeats);
  const rawOffer = {
    id: `offer-${variant.definitionId || template.id}-${variant.id}-${createId()}`,
    templateId: template.id,
    variantId: variant.id,
    definitionId: variant.definitionId || template.id,
    rolledOnDay: clampMarketDay(day, 1),
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
  const parsedDay = clampMarketDay(day, 1);
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
  const currentDay = clampMarketDay(day, workingState?.day || 1);
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
    const templateSlotsPerRoll = clampMarketPositiveInteger(marketConfig.slotsPerRoll ?? 1, 1);
    const defaultTemplateMaxActive = Math.max(templateSlotsPerRoll, variants.length);
    const templateMaxActive = clampMarketPositiveInteger(
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
        const variantMaxActive = clampMarketPositiveInteger(
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
      const variantMaxActive = clampMarketPositiveInteger(
        selectedVariant.maxActive != null ? selectedVariant.maxActive : selectedVariant.copies ?? 1,
        selectedVariant.copies ?? 1
      );
      const variantCapacity = Math.max(0, variantMaxActive - activeCount - pendingCount);
      if (variantCapacity <= 0) {
        pendingAdds.set(selectedVariant.id, pendingCount);
        templateAudit.reason = templateAudit.reason || 'variantCapacityReached';
        continue;
      }

      const variantCopies = clampMarketPositiveInteger(selectedVariant.copies ?? 1, 1);
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
  const targetDay = clampMarketDay(day, workingState?.day || 1);
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
  const targetDay = clampMarketDay(day, workingState?.day || 1);
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

