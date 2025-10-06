import { createId } from '../../../core/helpers.js';
import {
  clampMarketDay,
  clampMarketDaySpan,
  clampMarketPositiveInteger,
  cloneMarketMetadata
} from '../normalizers.js';
import {
  normalizeHustleMarketOffer
} from '../../../core/state/slices/hustleMarket/index.js';
import {
  resolveFirstNumber,
  resolveFirstString,
  resolveOfferHoursFromMetadata,
  resolveOfferPayoutAmountFromMetadata,
  resolveOfferPayoutScheduleFromMetadata
} from '../offerUtils.js';

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

const offerLifecycle = {
  buildOfferMetadata,
  createOfferFromVariant,
  isOfferActiveOnOrAfterDay,
  OFFER_EXPIRY_GRACE_DAYS
};

export {
  buildOfferMetadata,
  createOfferFromVariant,
  isOfferActiveOnOrAfterDay,
  OFFER_EXPIRY_GRACE_DAYS
};

export default offerLifecycle;
