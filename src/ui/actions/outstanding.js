import { formatHours } from '../../core/helpers.js';
import { getState } from '../../core/state.js';
import { getActionDefinition } from '../../game/registryService.js';
import {
  clampToZero,
  coerceDay,
  coercePositiveNumber,
  firstPositiveNumber,
  formatDuration,
  formatPayoutSummary
} from './utils.js';
import { getInstanceProgressSnapshot } from '../../core/state/slices/actions.js';

function resolveCategoryLabel(...values) {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const lowered = trimmed.toLowerCase();
    if (lowered.startsWith('study') || lowered.startsWith('education')) {
      return 'study';
    }
    if (lowered.startsWith('maint')) {
      return 'maintenance';
    }
    return lowered;
  }
  return null;
}

function resolveStudyTrackIdFromProgress(progress = {}) {
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

function collectMarketIndexes(state = {}) {
  const market = state?.hustleMarket || {};
  const offers = Array.isArray(market.offers) ? market.offers : [];
  const accepted = Array.isArray(market.accepted) ? market.accepted : [];

  const offersById = new Map();
  offers.forEach(offer => {
    if (offer?.id) {
      offersById.set(offer.id, offer);
    }
  });

  const acceptedByInstance = new Map();
  const acceptedByOffer = new Map();
  accepted.forEach(entry => {
    if (entry?.instanceId) {
      acceptedByInstance.set(entry.instanceId, entry);
    }
    if (entry?.offerId) {
      acceptedByOffer.set(entry.offerId, entry);
    }
  });

  return { offersById, acceptedByInstance, acceptedByOffer };
}

function buildProgressSnapshot({
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

  const resolvedMetadata = accepted?.metadata || offer?.claimMetadata || offer?.metadata || baseSnapshot.metadata || {};
  if (resolvedMetadata && resolvedMetadata !== progressOverrides.metadata) {
    progressOverrides.metadata = resolvedMetadata;
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

function createOutstandingEntry({
  state,
  definition,
  instance,
  accepted,
  offer,
  order
}) {
  const progress = buildProgressSnapshot({ state, definition, instance, accepted, offer });
  if (!progress) {
    return null;
  }

  const remainingRuns = progress.hoursRemaining != null && progress.stepHours > 0
    ? Math.max(1, Math.ceil(progress.hoursRemaining / progress.stepHours))
    : (progress.hoursRemaining === 0 && progress.completion === 'manual' ? 1 : null);

  if (progress.hoursRemaining != null && progress.hoursRemaining <= 0 && progress.completion !== 'manual') {
    return null;
  }

  const variantLabel = offer?.variant?.label || progress.metadata?.variantLabel || '';
  const baseName = instance?.name || definition?.name || definition?.id || 'Accepted hustle';
  const title = variantLabel ? `${variantLabel}` : baseName;
  const description = offer?.variant?.description || progress.metadata?.description || '';

  const metaParts = [];
  if (Number.isFinite(progress.percentComplete)) {
    const percent = Math.round(progress.percentComplete * 100);
    metaParts.push(`${Math.max(0, Math.min(100, percent))}% logged`);
  }
  if (progress.hoursRemaining != null) {
    metaParts.push(`${formatHours(progress.hoursRemaining)} left`);
  }
  if (progress.remainingDays != null) {
    metaParts.push(`${progress.remainingDays} day${progress.remainingDays === 1 ? '' : 's'} remaining`);
  }
  if (Number.isFinite(progress.payoutAmount) && progress.payoutAmount > 0) {
    metaParts.push(formatPayoutSummary(progress.payoutAmount, progress.payoutSchedule));
  }
  if (!metaParts.length && progress.hoursRequired != null) {
    metaParts.push(`${formatHours(progress.hoursLogged)} logged of ${formatHours(progress.hoursRequired)}`);
  }

  const metaClass = progress.remainingDays != null && progress.remainingDays <= 1
    ? 'todo-widget__meta--warning'
    : progress.remainingDays != null && progress.remainingDays <= 3
      ? 'todo-widget__meta--alert'
      : undefined;

  const category = resolveCategoryLabel(
    progress.metadata?.templateCategory,
    progress.metadata?.category,
    accepted?.metadata?.templateCategory,
    offer?.templateCategory,
    definition?.category
  );
  const focusCategory = category || 'commitment';

  return {
    id: `instance:${instance.id}`,
    title,
    subtitle: description,
    meta: metaParts.join(' • '),
    metaClass,
    durationHours: progress.stepHours,
    durationText: formatDuration(progress.stepHours),
    moneyCost: 0,
    payout: progress.payoutAmount || 0,
    payoutText: formatPayoutSummary(progress.payoutAmount, progress.payoutSchedule),
    repeatable: remainingRuns == null ? true : remainingRuns > 1,
    remainingRuns,
    focusCategory,
    focusBucket: 'commitment',
    orderIndex: order,
    progress,
    instanceId: instance.id,
    definitionId: progress.definitionId,
    offerId: progress.offerId,
    category: focusCategory,
    raw: {
      definition,
      instance,
      accepted,
      offer
    }
  };
}

export function collectOutstandingActionEntries(state = getState()) {
  const workingState = state || getState() || {};
  const actions = workingState?.actions || {};
  const { offersById, acceptedByInstance, acceptedByOffer } = collectMarketIndexes(workingState);

  const entries = [];
  const actionIds = Object.keys(actions);

  actionIds.forEach((actionId, index) => {
    const actionState = actions[actionId];
    if (!actionState) return;
    const instances = Array.isArray(actionState.instances) ? actionState.instances : [];
    if (!instances.length) return;

    const definition = getActionDefinition(actionId);
    instances.forEach((instance, instanceIndex) => {
      if (!instance || instance.completed) return;
      if (instance.status && instance.status !== 'active' && instance.status !== 'pending') {
        return;
      }

      const accepted = acceptedByInstance.get(instance.id)
        || acceptedByOffer.get(instance.offerId)
        || null;
      if (!accepted && !instance.accepted) {
        return;
      }

      const offer = accepted?.offerId ? offersById.get(accepted.offerId) : null;
      const entry = createOutstandingEntry({
        state: workingState,
        definition,
        instance,
        accepted,
        offer,
        order: -(index * 10 + instanceIndex)
      });
      if (entry) {
        const trackId = resolveStudyTrackIdFromProgress(entry.progress);
        if (trackId) {
          const knowledge = workingState?.progress?.knowledge || {};
          if (knowledge[trackId]?.studiedToday) {
            return;
          }
        }
        entries.push(entry);
      }
    });
  });

  entries.sort((a, b) => {
    const daysA = a?.progress?.remainingDays ?? Infinity;
    const daysB = b?.progress?.remainingDays ?? Infinity;
    if (daysA !== daysB) {
      return daysA - daysB;
    }
    const payoutA = Number.isFinite(a?.payout) ? a.payout : 0;
    const payoutB = Number.isFinite(b?.payout) ? b.payout : 0;
    if (payoutA !== payoutB) {
      return payoutB - payoutA;
    }
    return (a.orderIndex || 0) - (b.orderIndex || 0);
  });

  return entries;
}

export function createAutoCompletedEntries(summary = {}) {
  const entries = Array.isArray(summary?.timeBreakdown) ? summary.timeBreakdown : [];
  return entries
    .map((entry, index) => {
      const hours = clampToZero(entry?.hours);
      if (hours <= 0) return null;
      const category = typeof entry?.category === 'string' ? entry.category.toLowerCase() : '';
      const tracksMaintenance = category.startsWith('maintenance');
      const tracksStudy = category.startsWith('study') || category.startsWith('education');
      if (!tracksMaintenance && !tracksStudy) {
        return null;
      }

      const title = entry?.label
        || entry?.definition?.label
        || entry?.definition?.name
        || 'Scheduled work';
      const key = entry?.key || `${category || 'auto'}-${index}`;
      return {
        id: `auto:${key}`,
        title,
        durationHours: hours,
        durationText: formatHours(hours),
        category
      };
    })
    .filter(Boolean);
}

export function applyAutoCompletedEntries(target = {}, summary = {}) {
  if (!target || typeof target !== 'object') {
    return target;
  }
  const autoCompletedEntries = createAutoCompletedEntries(summary);
  if (autoCompletedEntries.length) {
    target.autoCompletedEntries = autoCompletedEntries;
  } else {
    delete target.autoCompletedEntries;
  }
  return target;
}

export default {
  collectOutstandingActionEntries,
  createAutoCompletedEntries,
  applyAutoCompletedEntries
};
