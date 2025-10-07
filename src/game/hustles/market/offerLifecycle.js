import { createId } from '../../../core/helpers.js';
import {
  clampMarketDay,
  clampMarketDaySpan,
  clampMarketPositiveInteger
} from '../normalizers.js';
import {
  normalizeHustleMarketOffer
} from '../../../core/state/slices/hustleMarket/index.js';
import { resolveHustleMetadata } from '../metadata.js';

const OFFER_EXPIRY_GRACE_DAYS = 2;

function createOfferFromVariant({ template, variant, day, timestamp }) {
  const availableOnDay = clampMarketDay(day, 1) + clampMarketDaySpan(variant.availableAfterDays || 0, 0);
  const expiresOnDay = availableOnDay
    + clampMarketDaySpan(variant.durationDays || 0, 0)
    + OFFER_EXPIRY_GRACE_DAYS;
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
    metadata: resolveHustleMetadata({
      template,
      variant,
      additionalMetadata: {
        availableAfterDays: variant.availableAfterDays,
        durationDays: variant.durationDays
      }
    }),
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

const offerLifecycle = {
  createOfferFromVariant,
  isOfferActiveOnOrAfterDay,
  OFFER_EXPIRY_GRACE_DAYS
};

export {
  createOfferFromVariant,
  isOfferActiveOnOrAfterDay,
  OFFER_EXPIRY_GRACE_DAYS
};

export default offerLifecycle;
