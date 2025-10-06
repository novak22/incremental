import { toNumber } from '../../../helpers.js';
import { getInstanceProgressSnapshot } from './progress.js';

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function resolveMetadata(candidates = []) {
  for (const candidate of candidates) {
    if (isPlainObject(candidate)) {
      return candidate;
    }
  }
  return {};
}

function resolveEarliestDay(candidates = []) {
  let earliest = null;
  for (const candidate of candidates) {
    const numeric = toNumber(candidate, null);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      continue;
    }
    const day = Math.max(1, Math.floor(numeric));
    if (earliest == null || day < earliest) {
      earliest = day;
    }
  }
  return earliest;
}

function resolveSchedule(candidates = []) {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}

function resolveNonNegativeNumber(candidates = []) {
  for (const candidate of candidates) {
    const numeric = toNumber(candidate, null);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric;
    }
  }
  return null;
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null) {
    return [];
  }
  return [value];
}

export function resolveInstanceProgressSnapshot(instance = {}, options = {}) {
  if (!isPlainObject(instance)) {
    return null;
  }

  const baseProgress = isPlainObject(instance.progress) ? instance.progress : {};
  const overridesSource = isPlainObject(options.progressOverrides)
    ? options.progressOverrides
    : {};
  const additionalOverrides = isPlainObject(options.progress)
    ? options.progress
    : null;
  const progressOverrides = additionalOverrides
    ? { ...overridesSource, ...additionalOverrides }
    : { ...overridesSource };

  const mergedProgress = Object.keys(progressOverrides).length
    ? { ...baseProgress, ...progressOverrides }
    : baseProgress;

  const snapshot = getInstanceProgressSnapshot(
    mergedProgress === baseProgress
      ? instance
      : { ...instance, progress: mergedProgress }
  );

  if (!snapshot) {
    return null;
  }

  const metadataSources = [
    progressOverrides.metadata,
    options.metadata,
    ...normalizeArray(options.metadataSources),
    snapshot.metadata,
    baseProgress.metadata
  ];
  const metadata = resolveMetadata(metadataSources);
  snapshot.metadata = metadata;

  const deadlineCandidates = [
    progressOverrides.deadlineDay,
    options.deadlineDay,
    ...normalizeArray(options.deadlineCandidates),
    snapshot.deadlineDay,
    instance.deadlineDay,
    baseProgress.deadlineDay
  ];
  const deadlineDay = resolveEarliestDay(deadlineCandidates);
  snapshot.deadlineDay = deadlineDay;

  const scheduleCandidates = [
    progressOverrides.payoutSchedule,
    options.payoutSchedule,
    options.payout?.schedule,
    options.payout?.payoutSchedule,
    snapshot.payoutSchedule
  ];
  const payoutSchedule = resolveSchedule(scheduleCandidates);
  if (payoutSchedule) {
    snapshot.payoutSchedule = payoutSchedule;
  } else {
    delete snapshot.payoutSchedule;
  }

  const amountCandidates = [
    progressOverrides.payoutAmount,
    options.payoutAmount,
    options.payout?.amount,
    snapshot.payoutAmount
  ];
  const payoutAmount = resolveNonNegativeNumber(amountCandidates);
  if (payoutAmount != null) {
    snapshot.payoutAmount = payoutAmount;
  } else {
    delete snapshot.payoutAmount;
  }

  return snapshot;
}

export default resolveInstanceProgressSnapshot;
