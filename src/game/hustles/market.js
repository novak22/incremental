import { structuredClone } from '../../core/helpers.js';
import {
  clampMarketDay,
  clampMarketDaySpan,
  clampMarketPositiveInteger
} from './normalizers.js';
import { getState } from '../../core/state.js';
import { ensureActionMarketCategoryState } from '../../core/state/slices/actionMarket/state.js';
import { normalizeActionMarketOffer } from '../../core/state/slices/actionMarket/index.js';
import {
  getActionMarketAvailableOffers,
  getActionMarketClaimedOffers
} from '../../core/state/slices/actionMarket/selectors.js';
import {
  attachAuditDebugTools,
  getMarketRollAuditLog,
  recordMarketRollAudit
} from './market/auditLog.js';
import {
  buildVariantPool,
  selectVariantFromPool
} from './market/variantSelection.js';
import {
  createOfferFromVariant,
  isOfferActiveOnOrAfterDay
} from './market/offerLifecycle.js';

export { getMarketRollAuditLog } from './market/auditLog.js';

export function rollDailyOffers({
  templates = [],
  day,
  now,
  state = getState(),
  rng = Math.random,
  category = 'hustle'
} = {}) {
  const workingState = state || getState();
  const currentDay = clampMarketDay(day, workingState?.day || 1);
  const timestamp = Number(now);
  const resolvedTimestamp = Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : Date.now();

  const marketState = ensureActionMarketCategoryState(workingState, category, { fallbackDay: currentDay });

  const preservedOffers = marketState.offers
    .filter(offer => isOfferActiveOnOrAfterDay(offer, currentDay))
    .map(offer => structuredClone(offer));

  const activeVariantsByTemplate = new Map();
  const templateAudits = [];
  for (const offer of preservedOffers) {
    if (!offer) continue;
    if (!activeVariantsByTemplate.has(offer.templateId)) {
      activeVariantsByTemplate.set(offer.templateId, {
        total: 0,
        claimedSeatUsage: 0,
        variants: new Map()
      });
    }
    const activity = activeVariantsByTemplate.get(offer.templateId);
    const resolvedSeats = clampMarketPositiveInteger(
      offer?.seats ?? offer?.variant?.seats ?? 1,
      1
    );
    const claimedSeatPenalty = offer.claimed ? Math.max(0, resolvedSeats - 1) : 0;
    activity.total += 1;
    activity.claimedSeatUsage = (activity.claimedSeatUsage || 0) + claimedSeatPenalty;
    if (!activity.variants.has(offer.variantId)) {
      activity.variants.set(offer.variantId, { total: 0, claimedSeatUsage: 0 });
    }
    const variantActivity = activity.variants.get(offer.variantId);
    variantActivity.total += 1;
    variantActivity.claimedSeatUsage += claimedSeatPenalty;
  }

  for (const template of templates) {
    if (!template || !template.id) continue;
    const templateId = template.id;

    if (!activeVariantsByTemplate.has(templateId)) {
      activeVariantsByTemplate.set(templateId, {
        total: 0,
        claimedSeatUsage: 0,
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
    const claimedSeatPenalty = activity.claimedSeatUsage || 0;
    const templateCapacity = Math.max(0, templateMaxActive - currentActive - claimedSeatPenalty);
    let slotsRemaining = Math.min(templateSlotsPerRoll, templateCapacity);
    if (slotsRemaining <= 0) {
      templateAudit.skipped = true;
      templateAudit.reason = 'maxActiveReached';
      continue;
    }

    const pendingAdds = new Map();

    while (slotsRemaining > 0) {
      const availableVariants = variants.filter(variant => {
        const variantActivity = activity.variants.get(variant.id) || { total: 0, claimedSeatUsage: 0 };
        const activeCount = variantActivity.total;
        const seatPenalty = variantActivity.claimedSeatUsage || 0;
        const pendingCount = pendingAdds.get(variant.id) || 0;
        const variantMaxActive = clampMarketPositiveInteger(
          variant.maxActive != null ? variant.maxActive : variant.copies ?? 1,
          variant.copies ?? 1
        );
        const capacity = variantMaxActive - activeCount - pendingCount - seatPenalty;
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

      const variantActivity = activity.variants.get(selectedVariant.id) || { total: 0, claimedSeatUsage: 0 };
      const activeCount = variantActivity.total;
      const seatPenalty = variantActivity.claimedSeatUsage || 0;
      const pendingCount = pendingAdds.get(selectedVariant.id) || 0;
      const variantMaxActive = clampMarketPositiveInteger(
        selectedVariant.maxActive != null ? selectedVariant.maxActive : selectedVariant.copies ?? 1,
        selectedVariant.copies ?? 1
      );
      const variantCapacity = Math.max(0, variantMaxActive - activeCount - pendingCount - seatPenalty);
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
        if (category && !offer.templateCategory) {
          offer.templateCategory = category;
        }
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
        const existingVariantActivity = activity.variants.get(variantId) || { total: 0, claimedSeatUsage: 0 };
        existingVariantActivity.total += addedCount;
        activity.variants.set(variantId, existingVariantActivity);
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

  preservedOffers.forEach(offer => {
    if (category && !offer.templateCategory) {
      offer.templateCategory = category;
    }
  });

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

  marketState.offers = preservedOffers.map(offer => normalizeActionMarketOffer(offer, {
    fallbackTimestamp: resolvedTimestamp,
    fallbackDay: currentDay,
    category
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
  includeClaimed = false,
  category = 'hustle'
} = {}) {
  const workingState = state || getState();
  const targetDay = clampMarketDay(day, workingState?.day || 1);
  return getActionMarketAvailableOffers(workingState, category, {
    day: targetDay,
    includeUpcoming,
    includeClaimed
  });
}

export function getClaimedOffers(state = getState(), {
  day,
  includeExpired = false,
  includeCompleted = false,
  category = 'hustle'
} = {}) {
  const workingState = state || getState();
  const targetDay = clampMarketDay(day, workingState?.day || 1);
  return getActionMarketClaimedOffers(workingState, category, {
    day: targetDay,
    includeExpired,
    includeCompleted
  });
}

function attachHustleMarketDebugTools() {
  attachAuditDebugTools({
    getState,
    getMarketAvailableOffers: (state, options) => getActionMarketAvailableOffers(state, 'hustle', options)
  });
}

attachHustleMarketDebugTools();

