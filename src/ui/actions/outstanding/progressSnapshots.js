import {
  coerceDay,
  coercePositiveNumber,
  firstPositiveNumber
} from '../utils.js';

export function resolveStudyTrackIdFromProgress(progress = {}) {
  if (!progress || typeof progress !== 'object') {
    return null;
  }

  const metadata = typeof progress.metadata === 'object' && progress.metadata !== null
    ? progress.metadata
    : {};

  const candidates = [
    progress.studyTrackId,
    progress.trackId,
    metadata.studyTrackId,
    metadata.trackId
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  const identifiers = [progress.definitionId, metadata.definitionId];
  for (const identifier of identifiers) {
    if (typeof identifier === 'string' && identifier.startsWith('study-')) {
      return identifier.slice('study-'.length);
    }
  }

  return null;
}

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

  const progress = typeof instance.progress === 'object' && instance.progress !== null
    ? instance.progress
    : {};

  const hoursRequiredCandidates = [
    instance.hoursRequired,
    progress.hoursRequired,
    accepted?.hoursRequired,
    offer?.metadata?.hoursRequired,
    offer?.metadata?.requirements?.hours,
    offer?.metadata?.requirements?.timeHours,
    definition?.time,
    definition?.action?.timeCost
  ];
  let hoursRequired = hoursRequiredCandidates.reduce((result, value) => {
    if (result != null) {
      return result;
    }
    const numeric = coercePositiveNumber(value, null);
    return Number.isFinite(numeric) ? numeric : null;
  }, null);

  const hoursLogged = coercePositiveNumber(
    progress.hoursLogged != null ? progress.hoursLogged : instance.hoursLogged,
    0
  );

  const metadataProgress = typeof accepted?.metadata?.progress === 'object' && accepted.metadata.progress !== null
    ? accepted.metadata.progress
    : typeof offer?.metadata?.progress === 'object' && offer.metadata.progress !== null
      ? offer.metadata.progress
      : {};

  const hoursPerDay = firstPositiveNumber(
    progress.hoursPerDay,
    accepted?.metadata?.hoursPerDay,
    metadataProgress.hoursPerDay,
    accepted?.metadata?.progress?.hoursPerDay,
    offer?.metadata?.hoursPerDay,
    offer?.metadata?.progress?.hoursPerDay
  );
  if (progress && hoursPerDay != null && (!Number.isFinite(progress.hoursPerDay) || progress.hoursPerDay <= 0)) {
    progress.hoursPerDay = hoursPerDay;
  }

  const daysCompleted = coercePositiveNumber(progress.daysCompleted, 0);

  const rawDaysRequired = firstPositiveNumber(
    progress.daysRequired,
    metadataProgress.daysRequired,
    accepted?.metadata?.daysRequired,
    accepted?.metadata?.progress?.daysRequired,
    offer?.metadata?.daysRequired,
    offer?.metadata?.progress?.daysRequired
  );
  const daysRequired = rawDaysRequired != null ? Math.max(1, Math.floor(rawDaysRequired)) : null;
  if (progress && daysRequired != null && (!Number.isFinite(progress.daysRequired) || progress.daysRequired <= 0)) {
    progress.daysRequired = daysRequired;
  }

  if ((hoursRequired == null || hoursRequired <= 0)
    && Number.isFinite(hoursPerDay)
    && hoursPerDay > 0
    && Number.isFinite(daysRequired)
    && daysRequired > 0) {
    const derivedHoursRequired = hoursPerDay * daysRequired;
    hoursRequired = derivedHoursRequired;
    if (progress && (!Number.isFinite(progress.hoursRequired) || progress.hoursRequired <= 0)) {
      progress.hoursRequired = derivedHoursRequired;
    }
  }

  const hoursRemaining = hoursRequired != null
    ? Math.max(0, hoursRequired - hoursLogged)
    : null;

  const completionCandidates = [
    progress.completion,
    progress.completionMode,
    metadataProgress.completionMode,
    metadataProgress.completion,
    accepted?.metadata?.completionMode,
    accepted?.metadata?.progress?.completionMode,
    accepted?.metadata?.progress?.completion,
    offer?.metadata?.completionMode,
    offer?.metadata?.progress?.completionMode,
    offer?.metadata?.progress?.completion,
    definition?.progress?.completion
  ];
  let completionMode = null;
  for (const candidate of completionCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      completionMode = candidate.trim();
      break;
    }
  }
  if (!completionMode) {
    completionMode = progress.type === 'instant' ? 'instant' : 'manual';
  }
  if (progress) {
    if (typeof progress.completion !== 'string' || !progress.completion.trim()) {
      progress.completion = completionMode;
    }
    progress.completionMode = completionMode;
  }

  let stepHours = Number.isFinite(hoursPerDay) && hoursPerDay > 0 ? hoursPerDay : null;
  if (!Number.isFinite(stepHours) || stepHours <= 0) {
    if (hoursRemaining != null && hoursRemaining > 0 && Number.isFinite(daysRequired) && daysRequired > 0) {
      const remainingDays = Math.max(1, daysRequired - Math.max(0, daysCompleted));
      stepHours = hoursRemaining / remainingDays;
    } else if (hoursRemaining != null && hoursRemaining > 0) {
      stepHours = hoursRemaining;
    } else if (Number.isFinite(hoursPerDay) && hoursPerDay > 0) {
      stepHours = hoursPerDay;
    }
  }
  if (!Number.isFinite(stepHours) || stepHours <= 0) {
    stepHours = hoursRequired != null && hoursRequired > 0 ? hoursRequired : 1;
  }
  if (hoursRemaining != null && hoursRemaining > 0) {
    stepHours = Math.min(stepHours, hoursRemaining);
  } else if (hoursRemaining != null && hoursRemaining <= 0) {
    stepHours = completionMode === 'manual' && Number.isFinite(hoursPerDay) && hoursPerDay > 0
      ? hoursPerDay
      : 0;
  }

  const deadlineCandidates = [
    instance.deadlineDay,
    progress.deadlineDay,
    accepted?.deadlineDay,
    offer?.claimDeadlineDay,
    offer?.expiresOnDay
  ]
    .map(value => coerceDay(value, null))
    .filter(value => value != null);

  const earliestDeadline = deadlineCandidates.length ? Math.min(...deadlineCandidates) : null;
  const currentDay = coerceDay(state?.day, 1) || 1;
  const remainingDays = earliestDeadline != null
    ? Math.max(0, earliestDeadline - currentDay + 1)
    : null;

  const payoutAmount = coercePositiveNumber(
    accepted?.payout?.amount != null ? accepted.payout.amount : offer?.metadata?.payoutAmount,
    null
  );
  const payoutSchedule = accepted?.payout?.schedule
    || offer?.metadata?.payoutSchedule
    || 'onCompletion';

  const percentComplete = hoursRequired && hoursRequired > 0
    ? Math.max(0, Math.min(1, hoursLogged / hoursRequired))
    : null;

  return {
    definitionId: definition?.id || instance.definitionId || accepted?.definitionId || offer?.definitionId,
    instanceId: instance.id,
    offerId: accepted?.offerId || offer?.id || null,
    templateId: accepted?.templateId || offer?.templateId || definition?.id || null,
    hoursLogged,
    hoursRequired,
    hoursRemaining,
    stepHours,
    hoursPerDay: Number.isFinite(hoursPerDay) && hoursPerDay > 0 ? hoursPerDay : null,
    daysCompleted,
    daysRequired,
    remainingDays,
    deadlineDay: earliestDeadline,
    payoutAmount,
    payoutSchedule,
    completion: completionMode,
    percentComplete,
    metadata: accepted?.metadata || offer?.claimMetadata || offer?.metadata || {},
    lastWorkedDay: coerceDay(progress.lastWorkedDay, null),
    acceptedOnDay: coerceDay(instance.acceptedOnDay, null)
  };
}

export default buildProgressSnapshot;
