import { createId, structuredClone, toNumber } from '../../../core/helpers.js';
import { getActionState, getState } from '../../../core/state.js';
import { markDirty } from '../../../core/events/invalidationBus.js';
import {
  createInstanceProgress,
  normalizeProgressLog,
  resolveProgressField,
  roundHours
} from './templates.js';
import { processCompletionPayout } from './payouts.js';

function ensureInstanceProgress(definition, stored, context = {}) {
  if (!stored) return null;
  if (!stored.progress || typeof stored.progress !== 'object') {
    stored.progress = createInstanceProgress(definition, {
      state: context.state,
      overrides: stored,
      metadata: context.metadata
    });
  }
  if (stored.progress.deadlineDay == null && stored.deadlineDay != null) {
    stored.progress.deadlineDay = Math.max(1, Math.floor(Number(stored.deadlineDay)) || 1);
  } else if (stored.deadlineDay == null && stored.progress.deadlineDay != null) {
    stored.deadlineDay = Math.max(1, Math.floor(Number(stored.progress.deadlineDay)) || 1);
  }
  return stored.progress;
}

function recomputeProgressSnapshot(progress) {
  if (!progress) return;
  progress.dailyLog = normalizeProgressLog(progress.dailyLog);
  let total = 0;
  let lastDay = null;
  for (const [dayKey, value] of Object.entries(progress.dailyLog)) {
    const numericDay = Math.max(1, Math.floor(Number(dayKey)) || 1);
    const numericHours = Number(value);
    if (!Number.isFinite(numericHours) || numericHours < 0) continue;
    total += numericHours;
    if (lastDay == null || numericDay > lastDay) {
      lastDay = numericDay;
    }
  }
  progress.hoursLogged = roundHours(total);
  progress.lastWorkedDay = lastDay;

  if (Number.isFinite(progress.hoursPerDay) && progress.hoursPerDay > 0) {
    const threshold = progress.hoursPerDay - 0.0001;
    progress.daysCompleted = Object.values(progress.dailyLog).filter(value => Number(value) >= threshold).length;
  } else if (!Number.isFinite(progress.daysCompleted)) {
    progress.daysCompleted = 0;
  }
}

export function isCompletionSatisfied(definition, stored) {
  if (!stored) return false;
  const progress = stored.progress;
  let hasAnyRequirement = false;

  if (progress) {
    if (Number.isFinite(progress.daysRequired) && progress.daysRequired > 0) {
      hasAnyRequirement = true;
      if (Number(progress.daysCompleted) < progress.daysRequired) {
        return false;
      }
    }
    const progressRequired = resolveProgressField(progress.hoursRequired, null);
    if (progressRequired != null && progressRequired >= 0) {
      hasAnyRequirement = true;
      if (Number(stored.hoursLogged) < progressRequired - 0.0001) {
        return false;
      }
    }
  }

  const required = resolveProgressField(stored.hoursRequired, null);
  if (required != null && required >= 0) {
    hasAnyRequirement = true;
    if (Number(stored.hoursLogged) < required - 0.0001) {
      return false;
    }
  }

  return hasAnyRequirement;
}

function resolveInstance(entry, instanceOrId) {
  if (!entry) return null;
  if (!instanceOrId) return null;
  if (typeof instanceOrId === 'object' && instanceOrId !== null) {
    const found = entry.instances.find(item => item.id === instanceOrId.id);
    return found || instanceOrId;
  }
  return entry.instances.find(item => item.id === instanceOrId) || null;
}

function resolveActionEntry(definition, state = getState()) {
  if (!definition?.id) {
    return null;
  }
  const entry = getActionState(definition.id, state);
  if (!entry.instances) {
    entry.instances = [];
  }
  return entry;
}

export function acceptActionInstance(definition, {
  state = getState(),
  metadata = {},
  overrides = {}
} = {}) {
  const entry = resolveActionEntry(definition, state);
  if (!entry) {
    return null;
  }
  const baseHours = Number(overrides.hoursRequired);
  const hoursRequired = Number.isFinite(baseHours) && baseHours >= 0
    ? baseHours
    : Number(metadata.time) || Number(definition?.time) || Number(definition?.action?.timeCost) || 0;
  const acceptedOnDay = Math.max(1, Math.floor(Number(state?.day) || 1));
  const instance = {
    id: createId(),
    definitionId: definition.id,
    name: definition.name || definition.id,
    accepted: true,
    acceptedOnDay,
    deadlineDay: overrides.deadlineDay != null
      ? Math.max(1, Math.floor(Number(overrides.deadlineDay)))
      : null,
    hoursRequired,
    hoursLogged: 0,
    status: 'active',
    payoutAwarded: 0,
    notes: undefined,
    ...overrides
  };
  instance.progress = createInstanceProgress(definition, { state, overrides, metadata });
  if (metadata && typeof metadata === 'object') {
    try {
      instance.metadata = structuredClone(metadata);
    } catch (_error) {
      instance.metadata = { ...metadata };
    }
  }
  if (instance.progress && instance.progress.hoursRequired != null && !Number.isFinite(toNumber(instance.hoursRequired, null))) {
    instance.hoursRequired = instance.progress.hoursRequired;
  }
  entry.instances.push(instance);
  markDirty('actions');
  return instance;
}

export function completeActionInstance(definition, instance, context = {}) {
  if (!definition?.id || !instance) {
    return null;
  }
  const state = context.state || getState();
  const entry = resolveActionEntry(definition, state);
  if (!entry) {
    return null;
  }
  const stored = entry.instances.find(item => item.id === instance.id) || instance;
  const hours = Number(context.effectiveTime);
  if (Number.isFinite(hours) && hours >= 0) {
    stored.hoursLogged = hours;
    if (!Number.isFinite(Number(stored.hoursRequired)) || Number(stored.hoursRequired) <= 0) {
      stored.hoursRequired = hours;
    }
    ensureInstanceProgress(definition, stored, context);
    if (stored.progress) {
      stored.progress.hoursLogged = roundHours(hours);
      stored.progress.dailyLog = normalizeProgressLog(stored.progress.dailyLog);
      stored.progress.daysCompleted = Number.isFinite(stored.progress.daysCompleted)
        ? stored.progress.daysCompleted
        : 0;
      stored.progress.lastWorkedDay = context.completionDay
        ? Math.max(1, Math.floor(Number(context.completionDay)))
        : stored.progress.lastWorkedDay;
    }
  }
  const payout = Number(context.finalPayout ?? context.payoutGranted);
  if (Number.isFinite(payout)) {
    stored.payoutAwarded = payout;
  }
  if (context.skillXpAwarded) {
    stored.skillXpAwarded = context.skillXpAwarded;
  }
  if (context.appliedEducationBoosts) {
    stored.educationBoosts = context.appliedEducationBoosts;
  }
  if (context.limitUsage) {
    stored.limitSnapshot = { ...context.limitUsage };
  }
  if (context.metadata) {
    stored.metadata = { ...stored.metadata, ...context.metadata };
  }
  stored.completed = true;
  stored.status = 'completed';
  const completionDay = Math.max(1, Math.floor(toNumber(context.completionDay, Number(state?.day) || stored.acceptedOnDay)));
  stored.completedOnDay = completionDay;
  ensureInstanceProgress(definition, stored, context);
  if (stored.progress) {
    stored.progress.completed = true;
    stored.progress.completedOnDay = completionDay;
    if (stored.progress.hoursLogged == null) {
      stored.progress.hoursLogged = roundHours(stored.hoursLogged);
    }
  }

  const completionHours = Number(stored.hoursLogged);
  const prepareCompletion = typeof definition?.__prepareCompletion === 'function'
    ? definition.__prepareCompletion
    : null;
  if (prepareCompletion) {
    try {
      prepareCompletion({
        context,
        instance: stored,
        state,
        completionDay,
        completionHours
      });
    } catch (_error) {
      // Swallow preparation errors to avoid blocking completion flows.
    }
  }

  processCompletionPayout({
    definition,
    stored,
    context,
    completionDay,
    completionHours,
    state
  });

  markDirty('actions');

  const completionHooks = Array.isArray(definition?.__completionHooks)
    ? definition.__completionHooks
    : [];

  if (completionHooks.length) {
    const hookContext = {
      ...context,
      state,
      definition,
      instance: stored
    };
    for (const hook of completionHooks) {
      try {
        hook(hookContext);
      } catch (_error) {
        // Swallow hook errors to keep completion flow resilient.
      }
    }
  }

  return stored;
}

export function abandonActionInstance(definition, instanceId, { state = getState() } = {}) {
  if (!definition?.id || !instanceId) {
    return false;
  }
  const entry = resolveActionEntry(definition, state);
  if (!entry) return false;
  const index = entry.instances.findIndex(item => item.id === instanceId);
  if (index === -1) return false;
  entry.instances.splice(index, 1);
  markDirty('actions');
  return true;
}

export function advanceActionInstance(definition, instanceOrId, {
  state = getState(),
  day,
  hours = 0,
  autoComplete = true,
  completionContext = {},
  metadata
} = {}) {
  if (!definition?.id) return null;
  const entry = resolveActionEntry(definition, state);
  if (!entry) return null;
  const stored = resolveInstance(entry, instanceOrId);
  if (!stored) return null;

  const progress = ensureInstanceProgress(definition, stored, { state, metadata });
  const workingDay = Math.max(1, Math.floor(toNumber(day, Number(state?.day) || stored.acceptedOnDay || 1)));
  const amount = Number(hours);
  if (progress && Number.isFinite(amount) && amount !== 0) {
    if (!progress.dailyLog || typeof progress.dailyLog !== 'object') {
      progress.dailyLog = {};
    }
    const current = Number(progress.dailyLog[workingDay]) || 0;
    const next = roundHours(current + amount);
    progress.dailyLog[workingDay] = next < 0 ? 0 : next;
  }

  recomputeProgressSnapshot(progress);
  if (progress) {
    stored.hoursLogged = roundHours(progress.hoursLogged);
    if (
      progress.hoursRequired != null &&
      (!Number.isFinite(stored.hoursRequired) || stored.hoursRequired < progress.hoursRequired)
    ) {
      stored.hoursRequired = progress.hoursRequired;
    }
  }

  markDirty('actions');

  const satisfied = isCompletionSatisfied(definition, stored);
  if (satisfied && autoComplete !== false) {
    const context = { ...completionContext };
    context.state = state;
    if (context.completionDay == null) {
      context.completionDay = workingDay;
    }
    if (context.metadata == null) {
      if (metadata && typeof metadata === 'object') {
        context.metadata = metadata;
      } else if (stored.metadata && typeof stored.metadata === 'object') {
        context.metadata = stored.metadata;
      }
    }
    completeActionInstance(definition, stored, context);
  }

  return { instance: stored, completed: satisfied };
}

export function resetActionInstance(definition, instanceOrId, {
  state = getState(),
  clearCompletion = true,
  metadata
} = {}) {
  if (!definition?.id) return null;
  const entry = resolveActionEntry(definition, state);
  if (!entry) return null;
  const stored = resolveInstance(entry, instanceOrId);
  if (!stored) return null;

  const progress = ensureInstanceProgress(definition, stored, { state, metadata });
  stored.hoursLogged = 0;
  if (progress) {
    progress.dailyLog = {};
    progress.daysCompleted = 0;
    progress.hoursLogged = 0;
    progress.lastWorkedDay = null;
    progress.completed = false;
    delete progress.completedOnDay;
  }

  if (clearCompletion) {
    stored.completed = false;
    stored.status = stored.accepted ? 'active' : 'pending';
    stored.completedOnDay = null;
    stored.payoutAwarded = 0;
  }

  markDirty('actions');
  return stored;
}
