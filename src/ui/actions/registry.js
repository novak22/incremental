import { formatHours, formatMoney } from '../../core/helpers.js';
import { getState } from '../../core/state.js';
import { getActionDefinition } from '../../game/registryService.js';

const DEFAULT_EMPTY_MESSAGE = 'Queue a hustle or upgrade to add new tasks.';

let providers = [];
let providerSequence = 0;

function coerceNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampToZero(value) {
  return Math.max(0, coerceNumber(value));
}

function formatDuration(hours) {
  const numeric = coerceNumber(hours);
  if (numeric <= 0) {
    return formatHours(0);
  }
  return formatHours(Math.max(0, numeric));
}

function coerceDay(value, fallback = null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.max(1, Math.floor(numeric));
}

function coercePositiveNumber(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return fallback;
  }
  return numeric;
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return null;
}

function formatPayoutSummary(amount, schedule) {
  if (!Number.isFinite(amount) || amount <= 0) {
    if (schedule && schedule !== 'onCompletion') {
      return schedule;
    }
    return '';
  }
  if (!schedule || schedule === 'onCompletion') {
    return `$${formatMoney(amount)} on completion`;
  }
  if (schedule === 'daily') {
    return `$${formatMoney(amount)} / day`;
  }
  return `$${formatMoney(amount)} (${schedule})`;
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
  const hoursRequired = hoursRequiredCandidates.reduce((result, value) => {
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

  const hoursRemaining = hoursRequired != null
    ? Math.max(0, hoursRequired - hoursLogged)
    : null;

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
    focusCategory: 'commitment',
    focusBucket: 'commitment',
    orderIndex: order,
    progress,
    instanceId: instance.id,
    definitionId: progress.definitionId,
    offerId: progress.offerId,
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

export function normalizeActionEntries(source = []) {
  const entries = Array.isArray(source?.entries)
    ? source.entries
    : Array.isArray(source)
      ? source
      : [];

  return entries
    .map((entry, index) => {
      const id = entry?.id ?? `todo-${index}`;
      if (!id) return null;

      const durationHours = coerceNumber(entry?.durationHours ?? entry?.timeCost);
      const normalizedDuration = durationHours > 0 ? durationHours : 0;
      const durationText = entry?.durationText || formatDuration(normalizedDuration);

      const payoutText = entry?.payoutText || entry?.payoutLabel || '';
      const meta = entry?.meta || [payoutText, durationText].filter(Boolean).join(' • ');

      const rawRemaining = entry?.remainingRuns == null
        ? null
        : coerceNumber(entry.remainingRuns, null);
      const hasRemaining = Number.isFinite(rawRemaining);
      const remainingRuns = hasRemaining ? Math.max(0, rawRemaining) : null;
      const repeatable = Boolean(entry?.repeatable) || (hasRemaining && remainingRuns > 1);

      const moneyCost = coerceNumber(entry?.moneyCost);
      const normalizedMoney = moneyCost > 0 ? moneyCost : 0;

      const rawPayout = coerceNumber(entry?.payout);
      const normalizedPayout = rawPayout > 0 ? rawPayout : 0;
      const moneyPerHour = normalizedDuration > 0
        ? normalizedPayout / normalizedDuration
        : normalizedPayout;

      const focusCategory = entry?.focusCategory || entry?.category || entry?.type || null;
      const rawUpgradeRemaining = coerceNumber(
        entry?.upgradeRemaining ?? entry?.remaining ?? entry?.requirementsRemaining,
        null
      );
      const upgradeRemaining = Number.isFinite(rawUpgradeRemaining)
        ? Math.max(0, rawUpgradeRemaining)
        : null;
      const orderIndex = Number.isFinite(entry?.orderIndex) ? entry.orderIndex : index;

      const normalizedEntry = {
        id,
        title: entry?.title || 'Action',
        meta,
        onClick: typeof entry?.onClick === 'function' ? entry.onClick : null,
        durationHours: normalizedDuration,
        durationText,
        moneyCost: normalizedMoney,
        repeatable,
        remainingRuns,
        payout: normalizedPayout,
        moneyPerHour: Number.isFinite(moneyPerHour) ? moneyPerHour : 0,
        focusCategory,
        upgradeRemaining,
        orderIndex
      };

      if (entry && typeof entry === 'object') {
        Object.keys(entry).forEach(key => {
          if (typeof key === 'string' && key.toLowerCase().includes('bucket')) {
            normalizedEntry[key] = entry[key];
          }
        });
      }

      if (entry?.subtitle) {
        normalizedEntry.subtitle = entry.subtitle;
      }
      if (entry?.description) {
        normalizedEntry.description = entry.description;
      }
      if (entry?.buttonLabel) {
        normalizedEntry.buttonLabel = entry.buttonLabel;
      }
      if (entry?.primaryLabel && !normalizedEntry.buttonLabel) {
        normalizedEntry.buttonLabel = entry.primaryLabel;
      }
      if (entry?.metaClass) {
        normalizedEntry.metaClass = entry.metaClass;
      }
      if (entry?.defaultLabel) {
        normalizedEntry.defaultLabel = entry.defaultLabel;
      }
      if (entry?.payoutText) {
        normalizedEntry.payoutText = entry.payoutText;
      }
      if (entry?.durationText && entry.durationText !== normalizedEntry.durationText) {
        normalizedEntry.durationText = entry.durationText;
      }

      const rawTime = coerceNumber(entry?.timeCost, null);
      if (Number.isFinite(rawTime)) {
        normalizedEntry.timeCost = Math.max(0, rawTime);
      }

      if (!normalizedEntry.timeCost && normalizedEntry.durationHours > 0) {
        normalizedEntry.timeCost = normalizedEntry.durationHours;
      }

      const rawMoney = coerceNumber(entry?.moneyCost, null);
      if (Number.isFinite(rawMoney) && rawMoney > 0) {
        normalizedEntry.moneyCost = rawMoney;
      }

      if (!normalizedEntry.payoutText && entry?.payoutText) {
        normalizedEntry.payoutText = entry.payoutText;
      }

      if (entry?.progress && typeof entry.progress === 'object') {
        normalizedEntry.progress = { ...entry.progress };
      }
      if (entry?.instanceId) {
        normalizedEntry.instanceId = entry.instanceId;
      }
      if (entry?.definitionId) {
        normalizedEntry.definitionId = entry.definitionId;
      }
      if (entry?.offerId) {
        normalizedEntry.offerId = entry.offerId;
      }

      normalizedEntry.raw = entry;

      return normalizedEntry;
    })
    .filter(Boolean);
}

function createAutoCompletedEntries(summary = {}) {
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

export function registerActionProvider(provider, priority = 0) {
  if (typeof provider !== 'function') {
    return () => {};
  }
  const record = {
    handler: provider,
    priority: coerceNumber(priority),
    order: providerSequence++
  };
  providers.push(record);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    providers = providers.filter(item => item !== record);
  };
}

export function clearActionProviders() {
  const previous = providers.slice();
  providers = [];
  return () => {
    providers = previous.slice();
  };
}

export function collectActionProviders({ state = {}, summary = {} } = {}) {
  const snapshots = [];

  const activeProviders = providers
    .slice()
    .sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.order - b.order;
    });

  activeProviders.forEach(provider => {
    const handler = provider?.handler;
    if (typeof handler !== 'function') return;

    let result;
    try {
      result = handler({ state, summary });
    } catch (error) {
      result = null;
    }

    if (!result) return;

    const focusCategory = result.focusCategory || null;
    const normalized = normalizeActionEntries(result.entries).map((entry, index) => ({
      ...entry,
      focusCategory: entry.focusCategory || focusCategory,
      orderIndex: Number.isFinite(entry.orderIndex) ? entry.orderIndex : index
    }));

    snapshots.push({
      id: result.id || null,
      focusCategory,
      entries: normalized,
      metrics: result.metrics || {}
    });
  });

  return snapshots;
}

function applyMetrics(target, metrics = {}) {
  if (!metrics || typeof metrics !== 'object') return;

  const keys = [
    'emptyMessage',
    'buttonClass',
    'defaultLabel',
    'hoursAvailable',
    'hoursAvailableLabel',
    'hoursSpent',
    'hoursSpentLabel',
    'moneyAvailable'
  ];

  keys.forEach(key => {
    if (target[key] == null && metrics[key] != null) {
      target[key] = metrics[key];
    }
  });

  if (!target.scroller && metrics.scroller) {
    target.scroller = metrics.scroller;
  }
}

function ensureResourceLabels(queue, state = {}) {
  if (queue.hoursAvailable == null) {
    queue.hoursAvailable = clampToZero(state.timeLeft);
  }

  if (queue.hoursSpent == null) {
    const baseHours = clampToZero(state.baseTime)
      + clampToZero(state.bonusTime)
      + clampToZero(state.dailyBonusTime);
    const available = clampToZero(queue.hoursAvailable);
    queue.hoursSpent = Math.max(0, baseHours - available);
  }

  if (!queue.hoursAvailableLabel && queue.hoursAvailable != null) {
    queue.hoursAvailableLabel = formatHours(clampToZero(queue.hoursAvailable));
  }

  if (!queue.hoursSpentLabel && queue.hoursSpent != null) {
    queue.hoursSpentLabel = formatHours(clampToZero(queue.hoursSpent));
  }

  if (queue.moneyAvailable == null && state.money != null) {
    queue.moneyAvailable = clampToZero(state.money);
  }
}

export function buildActionQueue({ state, summary = {} } = {}) {
  const resolvedState = state || getState() || {};
  const queue = {
    entries: [],
    autoCompletedEntries: createAutoCompletedEntries(summary)
  };

  const activeDay = coerceNumber(resolvedState?.day, null);
  queue.day = Number.isFinite(activeDay) ? activeDay : null;

  const snapshots = collectActionProviders({ state: resolvedState, summary });

  const outstandingEntries = collectOutstandingActionEntries(resolvedState);
  if (outstandingEntries.length) {
    queue.entries.push(...outstandingEntries);
  }

  snapshots.forEach(snapshot => {
    queue.entries.push(...snapshot.entries);
    applyMetrics(queue, snapshot.metrics);
  });

  if (!queue.entries.length && !queue.emptyMessage) {
    queue.emptyMessage = DEFAULT_EMPTY_MESSAGE;
  }

  ensureResourceLabels(queue, resolvedState);

  if (!queue.autoCompletedEntries.length) {
    delete queue.autoCompletedEntries;
  }

  if (!queue.scroller) {
    delete queue.scroller;
  }

  return queue;
}

export default {
  registerActionProvider,
  clearActionProviders,
  collectActionProviders,
  buildActionQueue,
  normalizeActionEntries,
  collectOutstandingActionEntries
};
