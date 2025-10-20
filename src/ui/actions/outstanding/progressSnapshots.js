import {
  coerceDay,
  coercePositiveNumber,
  firstPositiveNumber
} from '../utils.js';
import { resolveInstanceProgressSnapshot } from '../../../core/state/slices/actions/index.js';

function pickMetadata(...sources) {
  for (const source of sources) {
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      return source;
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

  const progressSource = typeof instance.progress === 'object' && instance.progress !== null
    ? instance.progress
    : {};
  const metadataProgress = typeof accepted?.metadata?.progress === 'object' && accepted.metadata.progress !== null
    ? accepted.metadata.progress
    : typeof offer?.metadata?.progress === 'object' && offer.metadata.progress !== null
      ? offer.metadata.progress
      : {};

  const progressOverrides = {};

  const completionCandidates = [
    progressSource.completionMode,
    progressSource.completion,
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
  if (progressOverrides.completion) {
    progressOverrides.completionMode = progressOverrides.completion;
  }

  const hoursRequired = firstPositiveNumber(
    progressSource.hoursRequired,
    instance.hoursRequired,
    metadataProgress.hoursRequired,
    accepted?.metadata?.hoursRequired,
    accepted?.metadata?.progress?.hoursRequired,
    offer?.metadata?.hoursRequired,
    offer?.metadata?.progress?.hoursRequired,
    offer?.metadata?.requirements?.hours,
    offer?.metadata?.requirements?.timeHours,
    definition?.progress?.hoursRequired,
    definition?.time,
    definition?.action?.timeCost
  );
  if (hoursRequired != null) {
    progressOverrides.hoursRequired = hoursRequired;
  }

  const hoursPerDay = firstPositiveNumber(
    progressSource.hoursPerDay,
    metadataProgress.hoursPerDay,
    accepted?.metadata?.hoursPerDay,
    accepted?.metadata?.progress?.hoursPerDay,
    offer?.metadata?.hoursPerDay,
    offer?.metadata?.progress?.hoursPerDay,
    definition?.progress?.hoursPerDay
  );
  if (hoursPerDay != null) {
    progressOverrides.hoursPerDay = hoursPerDay;
  }

  const rawDaysRequired = firstPositiveNumber(
    progressSource.daysRequired,
    metadataProgress.daysRequired,
    accepted?.metadata?.daysRequired,
    accepted?.metadata?.progress?.daysRequired,
    offer?.metadata?.daysRequired,
    offer?.metadata?.progress?.daysRequired,
    definition?.progress?.daysRequired
  );
  if (rawDaysRequired != null) {
    progressOverrides.daysRequired = Math.max(1, Math.floor(rawDaysRequired));
  }

  const metadataHoursCandidates = [
    metadataProgress.hoursRequired,
    accepted?.metadata?.hoursRequired,
    accepted?.metadata?.progress?.hoursRequired,
    offer?.metadata?.hoursRequired,
    offer?.metadata?.progress?.hoursRequired,
    offer?.metadata?.requirements?.hours,
    offer?.metadata?.requirements?.timeHours
  ];

  const metadataScheduleCandidates = [
    metadataProgress.hoursPerDay,
    metadataProgress.daysRequired,
    accepted?.metadata?.hoursPerDay,
    accepted?.metadata?.daysRequired,
    accepted?.metadata?.progress?.hoursPerDay,
    accepted?.metadata?.progress?.daysRequired,
    offer?.metadata?.hoursPerDay,
    offer?.metadata?.daysRequired,
    offer?.metadata?.progress?.hoursPerDay,
    offer?.metadata?.progress?.daysRequired
  ];

  const metadataProvidesDirectHours = metadataHoursCandidates.some(candidate => {
    const numeric = Number(candidate);
    return Number.isFinite(numeric) && numeric > 0;
  });

  const metadataProvidesSchedule = metadataScheduleCandidates.some(candidate => {
    const numeric = Number(candidate);
    return Number.isFinite(numeric) && numeric > 0;
  });

  if ((progressOverrides.hoursRequired == null || progressOverrides.hoursRequired <= 0)
    && Number.isFinite(progressOverrides.hoursPerDay)
    && progressOverrides.hoursPerDay > 0
    && Number.isFinite(progressOverrides.daysRequired)
    && progressOverrides.daysRequired > 0) {
    progressOverrides.hoursRequired = progressOverrides.hoursPerDay * progressOverrides.daysRequired;
  } else if (!metadataProvidesDirectHours
    && metadataProvidesSchedule
    && Number.isFinite(progressOverrides.hoursPerDay)
    && progressOverrides.hoursPerDay > 0
    && Number.isFinite(progressOverrides.daysRequired)
    && progressOverrides.daysRequired > 0) {
    progressOverrides.hoursRequired = progressOverrides.hoursPerDay * progressOverrides.daysRequired;
  }

  const metadata = pickMetadata(
    accepted?.metadata,
    offer?.claimMetadata,
    offer?.metadata,
    progressSource.metadata
  );

  const metadataSources = [
    accepted?.metadata,
    offer?.claimMetadata,
    offer?.metadata,
    progressSource.metadata
  ].filter(source => source && typeof source === 'object' && !Array.isArray(source));

  const deadlineCandidates = [
    accepted?.deadlineDay,
    offer?.claimDeadlineDay,
    offer?.expiresOnDay
  ].filter(candidate => candidate != null);

  const payoutAmountOverride = coercePositiveNumber(
    accepted?.payout?.amount != null ? accepted.payout.amount : offer?.metadata?.payoutAmount,
    null
  );

  const payoutScheduleOverride = (() => {
    const candidates = [accepted?.payout?.schedule, offer?.metadata?.payoutSchedule];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
    return null;
  })();

  const snapshot = resolveInstanceProgressSnapshot(instance, {
    progressOverrides,
    metadata,
    metadataSources,
    deadlineCandidates,
    payoutAmount: payoutAmountOverride,
    payoutSchedule: payoutScheduleOverride
  });
  if (!snapshot) {
    return null;
  }

  const currentDay = coerceDay(state?.day, 1) || 1;
  const remainingDays = snapshot.deadlineDay != null
    ? Math.max(0, snapshot.deadlineDay - currentDay + 1)
    : null;

  const payoutAmount = Number.isFinite(snapshot.payoutAmount) ? snapshot.payoutAmount : null;
  const payoutSchedule = snapshot.payoutSchedule || 'onCompletion';

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

