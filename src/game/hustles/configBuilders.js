import { clampMarketDaySpan, clampMarketPositiveInteger, cloneMarketMetadata } from './normalizers.js';
import { resolveHustleMetadata } from './metadata.js';

export { finalizeMetadata } from './metadata.js';

export function buildBaseMetadata({ hoursRequired, payoutAmount, progressLabel, hoursPerDay, daysRequired }) {
  const baseMetadata = {};

  if (hoursRequired != null) {
    baseMetadata.requirements = { hours: hoursRequired };
  }

  if (payoutAmount != null) {
    baseMetadata.payout = { amount: payoutAmount };
  }

  if (hoursPerDay != null) {
    baseMetadata.hoursPerDay = hoursPerDay;
  }

  if (daysRequired != null) {
    baseMetadata.daysRequired = daysRequired;
  }

  if (progressLabel) {
    baseMetadata.progressLabel = progressLabel;
  }

  return resolveHustleMetadata({ variantMetadata: baseMetadata });
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
  const variantMetadata = cloneMarketMetadata(metadata);

  const requirements = {
    ...cloneMarketMetadata(metadata?.requirements)
  };
  if (hoursRequired != null) {
    requirements.hours = hoursRequired;
  }
  if (Object.keys(requirements).length) {
    variantMetadata.requirements = requirements;
  }

  const payout = {
    ...cloneMarketMetadata(metadata?.payout)
  };
  if (payoutAmount != null) {
    payout.amount = payoutAmount;
    variantMetadata.payoutAmount = payoutAmount;
  }
  if (Object.keys(payout).length) {
    variantMetadata.payout = payout;
  }

  if (progressLabel) {
    variantMetadata.progressLabel = progressLabel;
  }

  if (hoursPerDay != null) {
    variantMetadata.hoursPerDay = hoursPerDay;
  }

  if (daysRequired != null) {
    variantMetadata.daysRequired = daysRequired;
  }

  if (progress) {
    variantMetadata.progress = progress;
  }

  const mergedMetadata = resolveHustleMetadata({ variantMetadata });

  const variant = {
    id,
    label,
    description,
    copies,
    durationDays: clampMarketDaySpan(durationDays, 0),
    availableAfterDays: clampMarketDaySpan(availableAfterDays, 0),
    metadata: mergedMetadata
  };

  if (seats != null) {
    variant.seats = clampMarketPositiveInteger(seats, 1);
  }

  return variant;
}

