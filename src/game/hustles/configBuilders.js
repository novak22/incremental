import { structuredClone } from '../../core/helpers.js';
import {
  clampMarketDaySpan,
  clampMarketPositiveInteger
} from './normalizers.js';
import {
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

export function buildBaseMetadata({ hoursRequired, payoutAmount, progressLabel, hoursPerDay, daysRequired }) {
  return finalizeMetadata({
    requirements: { hours: hoursRequired },
    payout: { amount: payoutAmount },
    hoursPerDay,
    daysRequired,
    progressLabel
  });
}

export function buildVariant({
  id,
  label,
  description,
  copies = 1,
  durationDays = 0,
  availableAfterDays = 0,
  payoutAmount,
  progressLabel,
  hoursRequired,
  hoursPerDay,
  daysRequired,
  progress,
  metadata = {},
  seats
}) {
  const mergedMetadata = finalizeMetadata({
    ...metadata,
    payoutAmount,
    progressLabel,
    requirements: { hours: hoursRequired },
    hoursPerDay,
    daysRequired
  });

  const variant = {
    id,
    label,
    description,
    copies,
    durationDays: clampMarketDaySpan(durationDays, 0),
    availableAfterDays: clampMarketDaySpan(availableAfterDays, 0),
    metadata: mergedMetadata
  };

  if (progress) {
    variant.metadata.progress = progress;
  }

  if (seats != null) {
    variant.seats = clampMarketPositiveInteger(seats, 1);
  }

  return variant;
}

