import { structuredClone, createId, toNumber } from '../../helpers.js';
import { getActionDefinition, getHustleDefinition } from '../registry.js';
import { createRegistrySliceManager } from './factory.js';

function resolveDefinition(id) {
  return getActionDefinition(id) || getHustleDefinition(id);
}

function createDefaultActionState(definition) {
  if (!definition) {
    return { instances: [] };
  }
  const base = structuredClone(definition.defaultState || {});
  if (!Array.isArray(base.instances)) {
    base.instances = [];
  } else {
    base.instances = base.instances.map(instance => structuredClone(instance));
  }
  return base;
}

function normalizeActionInstance(definition, instance = {}, { state } = {}) {
  const base = typeof instance === 'object' && instance !== null ? { ...instance } : {};
  const fallbackDay = Math.max(1, Math.floor(Number(state?.day) || 1));
  if (!base.id) {
    base.id = createId();
  }
  if (!base.definitionId) {
    base.definitionId = definition?.id || null;
  }
  const accepted = base.accepted === true || base.status === 'active' || base.status === 'completed';
  base.accepted = accepted;
  const required = Number(base.hoursRequired);
  if (!Number.isFinite(required) || required < 0) {
    const fallbackHours = Number(definition?.time) || Number(definition?.action?.timeCost) || 0;
    base.hoursRequired = fallbackHours > 0 ? fallbackHours : 0;
  } else {
    base.hoursRequired = required;
  }
  const logged = Number(base.hoursLogged);
  base.hoursLogged = Number.isFinite(logged) && logged >= 0 ? logged : 0;
  const payout = Number(base.payoutAwarded);
  base.payoutAwarded = Number.isFinite(payout) ? payout : 0;
  const acceptedOn = Number(base.acceptedOnDay);
  base.acceptedOnDay = Number.isFinite(acceptedOn) && acceptedOn > 0 ? Math.floor(acceptedOn) : fallbackDay;
  const deadline = Number(base.deadlineDay);
  base.deadlineDay = Number.isFinite(deadline) && deadline > 0 ? Math.floor(deadline) : null;
  const completedFlag = base.completed === true || base.status === 'completed';
  base.completed = completedFlag;
  const completedOn = Number(base.completedOnDay);
  if (completedFlag) {
    base.completedOnDay = Number.isFinite(completedOn) && completedOn > 0
      ? Math.floor(completedOn)
      : base.acceptedOnDay;
  } else {
    base.completedOnDay = Number.isFinite(completedOn) && completedOn > 0 ? Math.floor(completedOn) : null;
  }
  if (!base.status) {
    base.status = completedFlag ? 'completed' : (accepted ? 'active' : 'pending');
  }
  if (!Array.isArray(base.notes)) {
    delete base.notes;
  }
  return base;
}

function normalizeActionState(definition, entry = {}, context) {
  const defaults = createDefaultActionState(definition);
  const normalized = { ...defaults };
  const existing = typeof entry === 'object' && entry !== null ? entry : {};

  for (const [key, value] of Object.entries(existing)) {
    if (key === 'instances') continue;
    normalized[key] = value;
  }

  const legacyRuns = toNumber(existing.runsToday, null);
  if (legacyRuns !== null) {
    normalized.runsToday = legacyRuns >= 0 ? legacyRuns : 0;
  } else if (typeof normalized.runsToday !== 'number') {
    normalized.runsToday = toNumber(defaults.runsToday, 0);
  }

  const legacyLastRun = toNumber(existing.lastRunDay, null);
  if (legacyLastRun !== null) {
    normalized.lastRunDay = legacyLastRun >= 0 ? Math.floor(legacyLastRun) : 0;
  } else if (typeof normalized.lastRunDay !== 'number') {
    normalized.lastRunDay = toNumber(defaults.lastRunDay, 0);
  }

  const sourceInstances = Array.isArray(existing.instances) && existing.instances.length
    ? existing.instances
    : Array.isArray(defaults.instances)
      ? defaults.instances
      : [];

  normalized.instances = sourceInstances.map(instance => normalizeActionInstance(definition, instance, context));

  return normalized;
}

function migrateLegacyHustleProgress({ state, sliceState }) {
  const legacy = state?.hustles;
  if (!legacy || typeof legacy !== 'object') {
    return;
  }

  for (const [id, legacyEntry] of Object.entries(legacy)) {
    if (!legacyEntry) continue;
    const definition = resolveDefinition(id);
    if (!definition) continue;
    const target = sliceState[id];
    if (!target) continue;

    if (legacyEntry.runsToday != null) {
      const runs = toNumber(legacyEntry.runsToday, 0);
      const defaultRuns = toNumber(definition?.defaultState?.runsToday, 0);
      if (target.runsToday == null || target.runsToday === defaultRuns) {
        target.runsToday = runs >= 0 ? runs : 0;
      }
    }

    if (legacyEntry.lastRunDay != null) {
      const lastRun = toNumber(legacyEntry.lastRunDay, 0);
      const defaultLastRun = toNumber(definition?.defaultState?.lastRunDay, 0);
      if (target.lastRunDay == null || target.lastRunDay === defaultLastRun) {
        target.lastRunDay = lastRun >= 0 ? Math.floor(lastRun) : 0;
      }
    }

    if ((!Array.isArray(target.instances) || target.instances.length === 0) && Array.isArray(legacyEntry.instances)) {
      target.instances = legacyEntry.instances.map(instance => normalizeActionInstance(definition, instance, { state }));
    }

    for (const [key, value] of Object.entries(legacyEntry)) {
      if (key === 'runsToday' || key === 'lastRunDay' || key === 'instances') continue;
      if (target[key] === undefined) {
        target[key] = value;
      }
    }
  }
}

const { ensureSlice, getSliceState } = createRegistrySliceManager({
  sliceKey: 'actions',
  registryKey: 'actions',
  definitionLookup: resolveDefinition,
  defaultFactory: definition => createDefaultActionState(definition),
  normalizer: (definition, entry, context) => normalizeActionState(definition, entry, context),
  ensureHook: migrateLegacyHustleProgress
});

export { ensureSlice, getSliceState };
