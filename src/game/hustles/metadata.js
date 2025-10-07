import { structuredClone } from '../../core/helpers.js';
import { clampMarketPositiveInteger, cloneMarketMetadata } from './normalizers.js';
import {
  resolveFirstNumber,
  resolveFirstString,
  resolveOfferHoursFromMetadata,
  resolveOfferPayoutAmountFromMetadata,
  resolveOfferPayoutScheduleFromMetadata
} from './offerUtils.js';

const FALLBACK_PAYOUT_SCHEDULE = 'onCompletion';

export function finalizeMetadata(metadata, { fallbackSchedule = FALLBACK_PAYOUT_SCHEDULE } = {}) {
  const working = structuredClone(metadata);

  if (working.hoursPerDay == null) {
    delete working.hoursPerDay;
  }

  if (working.daysRequired == null) {
    delete working.daysRequired;
  } else {
    working.daysRequired = clampMarketPositiveInteger(working.daysRequired, 1);
  }

  if (!working.progressLabel) {
    delete working.progressLabel;
  }

  const resolvedHours = resolveOfferHoursFromMetadata(working, null);
  if (resolvedHours != null) {
    const requirements = working.requirements && typeof working.requirements === 'object'
      ? working.requirements
      : {};
    requirements.hours = resolvedHours;
    working.requirements = requirements;
    working.hoursRequired = resolvedHours;
  }

  const resolvedAmount = resolveOfferPayoutAmountFromMetadata(working, null);
  if (resolvedAmount != null) {
    working.payout = {
      ...(working.payout && typeof working.payout === 'object' ? working.payout : {}),
      amount: resolvedAmount
    };
    working.payoutAmount = resolvedAmount;
  }

  const schedule = resolveOfferPayoutScheduleFromMetadata(working, fallbackSchedule);
  working.payout = {
    ...(working.payout && typeof working.payout === 'object' ? working.payout : {}),
    schedule
  };
  working.payoutSchedule = schedule;

  return working;
}

export function resolveHustleMetadata({
  template,
  templateMetadata = template?.market?.metadata,
  templateProgress = template?.progress,
  variant,
  variantMetadata = variant?.metadata,
  variantProgress = variantMetadata?.progress,
  fallbackSchedule = FALLBACK_PAYOUT_SCHEDULE,
  additionalMetadata = {}
} = {}) {
  const baseMetadata = cloneMarketMetadata(templateMetadata);
  const baseProgress = cloneMarketMetadata(baseMetadata?.progress);
  const templateProgressClone = cloneMarketMetadata(templateProgress);
  const incomingVariantMetadata = cloneMarketMetadata(variantMetadata);
  const incomingVariantProgress = cloneMarketMetadata(variantProgress);

  const requirements = {
    ...cloneMarketMetadata(baseMetadata?.requirements),
    ...cloneMarketMetadata(incomingVariantMetadata?.requirements)
  };

  const payout = {
    ...cloneMarketMetadata(baseMetadata?.payout),
    ...cloneMarketMetadata(incomingVariantMetadata?.payout)
  };

  const metadata = {
    ...baseMetadata,
    ...incomingVariantMetadata,
    ...additionalMetadata,
    requirements,
    payout
  };

  const progress = {
    ...cloneMarketMetadata(baseProgress),
    ...cloneMarketMetadata(incomingVariantMetadata?.progress),
    ...incomingVariantProgress
  };

  const resolvedHours = resolveOfferHoursFromMetadata(
    [
      { ...incomingVariantMetadata, requirements },
      incomingVariantMetadata,
      baseMetadata
    ],
    template,
    [incomingVariantMetadata?.timeHours, incomingVariantMetadata?.hours, baseMetadata?.timeHours]
  );
  if (resolvedHours != null) {
    requirements.hours = resolvedHours;
  }

  const resolvedPayoutAmount = resolveOfferPayoutAmountFromMetadata(
    [
      { ...incomingVariantMetadata, payout },
      incomingVariantMetadata,
      baseMetadata
    ],
    template
  );
  if (resolvedPayoutAmount != null) {
    payout.amount = resolvedPayoutAmount;
  }

  const resolvedSchedule = resolveOfferPayoutScheduleFromMetadata(
    [
      { ...incomingVariantMetadata, payout },
      incomingVariantMetadata,
      baseMetadata
    ],
    fallbackSchedule
  );
  payout.schedule = resolvedSchedule;

  const resolvedHoursPerDay = resolveFirstNumber(
    incomingVariantMetadata?.hoursPerDay,
    incomingVariantProgress?.hoursPerDay,
    baseMetadata?.hoursPerDay,
    baseProgress?.hoursPerDay,
    templateProgressClone?.hoursPerDay
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
    incomingVariantMetadata?.daysRequired,
    incomingVariantProgress?.daysRequired,
    baseMetadata?.daysRequired,
    baseProgress?.daysRequired,
    templateProgressClone?.daysRequired
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
    incomingVariantMetadata?.completionMode,
    incomingVariantMetadata?.completion,
    incomingVariantProgress?.completionMode,
    incomingVariantProgress?.completion,
    baseMetadata?.completionMode,
    baseProgress?.completionMode,
    baseProgress?.completion,
    templateProgressClone?.completionMode,
    templateProgressClone?.completion
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
    incomingVariantMetadata?.progressLabel,
    incomingVariantProgress?.label,
    incomingVariantProgress?.progressLabel,
    baseMetadata?.progressLabel,
    baseProgress?.label,
    templateProgressClone?.label
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
  } else {
    delete metadata.progress;
  }

  if (resolvedHours != null) {
    metadata.hoursRequired = resolvedHours;
  }
  if (resolvedPayoutAmount != null) {
    metadata.payoutAmount = resolvedPayoutAmount;
  }
  metadata.payoutSchedule = resolvedSchedule;

  return finalizeMetadata(metadata, { fallbackSchedule });
}

export { FALLBACK_PAYOUT_SCHEDULE };
