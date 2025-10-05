import { createId, toNumber } from '../../core/helpers.js';
import { getActionState, getState } from '../../core/state.js';
import { markDirty } from '../../core/events/invalidationBus.js';

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
  markDirty('actions');
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
