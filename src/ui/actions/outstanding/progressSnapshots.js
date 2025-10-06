import {
  coerceDay,
  coercePositiveNumber,
  firstPositiveNumber
} from '../utils.js';
import { getInstanceProgressSnapshot } from '../../../core/state/slices/actions/index.js';

export function buildProgressSnapshot({
  state,
  definition,
  instance,
  accepted,
  offer
}) {
  if (!instance) {
    return null;
  }

  const baseSnapshot = getInstanceProgressSnapshot(instance);
  if (!baseSnapshot) {
    return null;
  }

  const progressSource = typeof instance.progress === 'object' && instance.progress !== null
    ? instance.progress
    : {};
  const progressOverrides = { ...progressSource };

  const metadataProgress = typeof accepted?.metadata?.progress === 'object' && accepted.metadata.progress !== null
    ? accepted.metadata.progress
    : typeof offer?.metadata?.progress === 'object' && offer.metadata.progress !== null
      ? offer.metadata.progress
      : {};

  const resolvedMetadata = accepted?.metadata
    || offer?.claimMetadata
    || offer?.metadata
    || baseSnapshot.metadata
    || {};
  if (resolvedMetadata && resolvedMetadata !== progressOverrides.metadata) {
    progressOverrides.metadata = resolvedMetadata;
  }

  const completionCandidates = [
    progressOverrides.completionMode,
    progressOverrides.completion,
    metadataProgress.completionMode,
    metadataProgress.completion,
    accepted?.metadata?.completionMode,
    accepted?.metadata?.completion,
    accepted?.metadata?.progress?.completionMode,
    accepted?.metadata?.progress?.completion,
    offer?.claimMetadata?.completionMode,
    offer?.claimMetadata?.completion,
    offer?.metadata?.completionMode,
    offer?.metadata?.completion,
    offer?.metadata?.progress?.completionMode,
    offer?.metadata?.progress?.completion,
    definition?.progress?.completionMode,
    definition?.progress?.completion
  ];
  for (const candidate of completionCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      progressOverrides.completion = candidate.trim();
      break;
    }
  }

  let hoursRequired = baseSnapshot.hoursRequired;
  if (!(Number.isFinite(hoursRequired) && hoursRequired >= 0)) {
    const hoursRequiredCandidates = [
      accepted?.hoursRequired,
      offer?.metadata?.hoursRequired,
      offer?.metadata?.requirements?.hours,
      offer?.metadata?.requirements?.timeHours,
      definition?.time,
      definition?.action?.timeCost
    ];
    for (const candidate of hoursRequiredCandidates) {
      const numeric = coercePositiveNumber(candidate, null);
      if (Number.isFinite(numeric) && numeric >= 0) {
        hoursRequired = numeric;
        break;
      }
    }
    if (hoursRequired != null) {
      progressOverrides.hoursRequired = hoursRequired;
    }
  }

  const hoursPerDayCandidate = firstPositiveNumber(
    baseSnapshot.hoursPerDay,
    accepted?.metadata?.hoursPerDay,
    metadataProgress.hoursPerDay,
    accepted?.metadata?.progress?.hoursPerDay,
    offer?.metadata?.hoursPerDay,
    offer?.metadata?.progress?.hoursPerDay
  );
  if (hoursPerDayCandidate != null
    && (!Number.isFinite(baseSnapshot.hoursPerDay) || baseSnapshot.hoursPerDay <= 0)) {
    progressOverrides.hoursPerDay = hoursPerDayCandidate;
  }

  const rawDaysRequired = firstPositiveNumber(
    baseSnapshot.daysRequired,
    metadataProgress.daysRequired,
    accepted?.metadata?.daysRequired,
    accepted?.metadata?.progress?.daysRequired,
    offer?.metadata?.daysRequired,
    offer?.metadata?.progress?.daysRequired
  );
  if (rawDaysRequired != null
    && (!Number.isFinite(baseSnapshot.daysRequired) || baseSnapshot.daysRequired <= 0)) {
    progressOverrides.daysRequired = Math.max(1, Math.floor(rawDaysRequired));
  }

  if ((progressOverrides.hoursRequired == null || progressOverrides.hoursRequired <= 0)
    && Number.isFinite(progressOverrides.hoursPerDay)
    && progressOverrides.hoursPerDay > 0
    && Number.isFinite(progressOverrides.daysRequired)
    && progressOverrides.daysRequired > 0) {
    progressOverrides.hoursRequired = progressOverrides.hoursPerDay * progressOverrides.daysRequired;
  }

  const deadlineCandidates = [
    instance.deadlineDay,
    progressOverrides.deadlineDay,
    baseSnapshot.deadlineDay,
    accepted?.deadlineDay,
    offer?.claimDeadlineDay,
    offer?.expiresOnDay
  ]
    .map(value => coerceDay(value, null))
    .filter(value => value != null);
  const earliestDeadline = deadlineCandidates.length ? Math.min(...deadlineCandidates) : null;
  if (earliestDeadline != null) {
    progressOverrides.deadlineDay = earliestDeadline;
  }

  if (typeof progressOverrides.completion !== 'string' || !progressOverrides.completion.trim()) {
    progressOverrides.completion = baseSnapshot.completion;
  }
  progressOverrides.completionMode = progressOverrides.completion;

  const snapshot = getInstanceProgressSnapshot({ ...instance, progress: progressOverrides }) || baseSnapshot;

  const currentDay = coerceDay(state?.day, 1) || 1;
  const remainingDays = snapshot.deadlineDay != null
    ? Math.max(0, snapshot.deadlineDay - currentDay + 1)
    : null;

  const payoutAmount = coercePositiveNumber(
    accepted?.payout?.amount != null ? accepted.payout.amount : offer?.metadata?.payoutAmount,
    null
  );
  const payoutSchedule = accepted?.payout?.schedule
    || offer?.metadata?.payoutSchedule
    || 'onCompletion';

  const completionMode = snapshot.completionMode || snapshot.completion || 'manual';

  let stepHours = Number.isFinite(snapshot.hoursPerDay) && snapshot.hoursPerDay > 0 ? snapshot.hoursPerDay : null;
  if (!Number.isFinite(stepHours) || stepHours <= 0) {
    if (snapshot.hoursRemaining != null
      && snapshot.hoursRemaining > 0
      && Number.isFinite(snapshot.daysRequired)
      && snapshot.daysRequired > 0) {
      const remainingDaySlots = Math.max(1, snapshot.daysRequired - Math.max(0, snapshot.daysCompleted));
      stepHours = snapshot.hoursRemaining / remainingDaySlots;
    } else if (snapshot.hoursRemaining != null && snapshot.hoursRemaining > 0) {
      stepHours = snapshot.hoursRemaining;
    } else if (Number.isFinite(snapshot.hoursPerDay) && snapshot.hoursPerDay > 0) {
      stepHours = snapshot.hoursPerDay;
    }
  }
  if (!Number.isFinite(stepHours) || stepHours <= 0) {
    stepHours = snapshot.hoursRequired != null && snapshot.hoursRequired > 0
      ? snapshot.hoursRequired
      : 1;
  }
  if (snapshot.hoursRemaining != null && snapshot.hoursRemaining > 0) {
    stepHours = Math.min(stepHours, snapshot.hoursRemaining);
  } else if (snapshot.hoursRemaining != null && snapshot.hoursRemaining <= 0) {
    stepHours = completionMode === 'manual' && Number.isFinite(snapshot.hoursPerDay) && snapshot.hoursPerDay > 0
      ? snapshot.hoursPerDay
      : 0;
  }

  return {
    definitionId: definition?.id || snapshot.definitionId || instance.definitionId || accepted?.definitionId || offer?.definitionId,
    instanceId: snapshot.instanceId || instance.id,
    offerId: accepted?.offerId || offer?.id || null,
    templateId: accepted?.templateId || offer?.templateId || definition?.id || null,
    hoursLogged: snapshot.hoursLogged,
    hoursRequired: snapshot.hoursRequired,
    hoursRemaining: snapshot.hoursRemaining,
    stepHours,
    hoursPerDay: Number.isFinite(snapshot.hoursPerDay) && snapshot.hoursPerDay > 0 ? snapshot.hoursPerDay : null,
    daysCompleted: snapshot.daysCompleted,
    daysRequired: snapshot.daysRequired,
    remainingDays,
    deadlineDay: snapshot.deadlineDay,
    payoutAmount,
    payoutSchedule,
    completion: completionMode,
    completionMode,
    percentComplete: snapshot.percentComplete,
    metadata: snapshot.metadata || {},
    lastWorkedDay: coerceDay(snapshot.lastWorkedDay, null),
    acceptedOnDay: coerceDay(snapshot.acceptedOnDay ?? instance.acceptedOnDay, null)
  };
}

export default buildProgressSnapshot;
