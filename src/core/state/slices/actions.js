import { structuredClone, createId, toNumber } from '../../helpers.js';
import { getActionDefinition, getHustleDefinition } from '../registry.js';
import knowledgeTrackData from '../../../game/requirements/data/knowledgeTracks.js';
import { createRegistrySliceManager } from './factory.js';

const KNOWLEDGE_TRACKS = knowledgeTrackData;

function resolveDefinition(id) {
  return getActionDefinition(id) || getHustleDefinition(id);
}

function normalizeProgressLog(log = {}) {
  const normalized = {};
  for (const [dayKey, value] of Object.entries(log || {})) {
    const day = Math.max(1, Math.floor(Number(dayKey)) || 1);
    const hours = Number(value);
    if (!Number.isFinite(hours) || hours < 0) continue;
    normalized[day] = Number.isFinite(normalized[day]) ? normalized[day] + hours : hours;
  }
  return normalized;
}

function normalizeInstanceProgress(definition, instance = {}) {
  const template = typeof definition?.progress === 'object' && definition.progress !== null
    ? definition.progress
    : {};
  const source = typeof instance.progress === 'object' && instance.progress !== null
    ? instance.progress
    : {};

  const progress = {};
  progress.type = typeof source.type === 'string' ? source.type : template.type || 'instant';
  const fallbackCompletion = template.completion || (progress.type === 'instant' ? 'instant' : 'deferred');
  progress.completion = typeof source.completion === 'string' ? source.completion : fallbackCompletion;

  const hoursRequiredSource = toNumber(source.hoursRequired, null);
  const hoursRequiredTemplate = toNumber(template.hoursRequired, null);
  const hoursRequiredInstance = toNumber(instance.hoursRequired, null);
  const resolvedHoursRequired = hoursRequiredSource != null
    ? hoursRequiredSource
    : hoursRequiredTemplate != null
      ? hoursRequiredTemplate
      : hoursRequiredInstance;
  progress.hoursRequired = Number.isFinite(resolvedHoursRequired) && resolvedHoursRequired >= 0
    ? resolvedHoursRequired
    : null;

  const hoursPerDaySource = toNumber(source.hoursPerDay, null);
  const hoursPerDayTemplate = toNumber(template.hoursPerDay, null);
  const resolvedHoursPerDay = hoursPerDaySource != null ? hoursPerDaySource : hoursPerDayTemplate;
  progress.hoursPerDay = Number.isFinite(resolvedHoursPerDay) && resolvedHoursPerDay > 0 ? resolvedHoursPerDay : null;

  const daysRequiredSource = toNumber(source.daysRequired, null);
  const daysRequiredTemplate = toNumber(template.daysRequired, null);
  const resolvedDaysRequired = daysRequiredSource != null ? daysRequiredSource : daysRequiredTemplate;
  progress.daysRequired = Number.isFinite(resolvedDaysRequired) && resolvedDaysRequired > 0
    ? Math.floor(resolvedDaysRequired)
    : null;

  let deadline = source.deadlineDay;
  if (deadline == null) {
    deadline = template.deadlineDay;
  }
  if (deadline == null) {
    deadline = instance.deadlineDay;
  }
  progress.deadlineDay = Number.isFinite(deadline) && deadline > 0 ? Math.floor(deadline) : null;

  const normalizedLog = normalizeProgressLog(source.dailyLog);
  progress.dailyLog = normalizedLog;
  let totalHours = 0;
  let lastWorked = null;
  for (const [dayKey, value] of Object.entries(normalizedLog)) {
    const day = Math.max(1, Math.floor(Number(dayKey)) || 1);
    const hours = Number(value);
    if (!Number.isFinite(hours) || hours < 0) continue;
    totalHours += hours;
    if (lastWorked == null || day > lastWorked) {
      lastWorked = day;
    }
  }

  const hoursLoggedSource = toNumber(source.hoursLogged, null);
  const hoursLoggedInstance = toNumber(instance.hoursLogged, null);
  const resolvedHoursLogged = hoursLoggedSource != null
    ? hoursLoggedSource
    : Number.isFinite(totalHours)
      ? totalHours
      : hoursLoggedInstance;
  progress.hoursLogged = Number.isFinite(resolvedHoursLogged) && resolvedHoursLogged >= 0 ? resolvedHoursLogged : 0;

  const hoursPerDay = Number(progress.hoursPerDay);
  if (Number.isFinite(hoursPerDay) && hoursPerDay > 0) {
    const threshold = hoursPerDay - 0.0001;
    progress.daysCompleted = Object.values(normalizedLog).filter(hours => Number(hours) >= threshold).length;
  } else {
    const daysCompletedSource = toNumber(source.daysCompleted, null);
    progress.daysCompleted = Number.isFinite(daysCompletedSource) && daysCompletedSource >= 0
      ? Math.floor(daysCompletedSource)
      : 0;
  }

  if (lastWorked != null) {
    progress.lastWorkedDay = lastWorked;
  } else if (source.lastWorkedDay != null) {
    const parsed = Math.floor(Number(source.lastWorkedDay));
    progress.lastWorkedDay = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } else {
    progress.lastWorkedDay = null;
  }

  progress.completed = source.completed === true || instance.completed === true;
  if (source.completedOnDay != null) {
    const parsed = Math.floor(Number(source.completedOnDay));
    progress.completedOnDay = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  } else if (progress.completed && instance.completedOnDay != null) {
    const parsed = Math.floor(Number(instance.completedOnDay));
    progress.completedOnDay = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  return progress;
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
  if (definition) {
    const normalizedProgress = normalizeInstanceProgress(definition, base);
    base.progress = normalizedProgress;
    const progressHours = toNumber(normalizedProgress.hoursLogged, null);
    if (Number.isFinite(progressHours) && progressHours >= 0) {
      base.hoursLogged = progressHours;
    } else {
      base.progress.hoursLogged = base.hoursLogged;
    }
    if (normalizedProgress.deadlineDay != null && base.deadlineDay == null) {
      base.deadlineDay = normalizedProgress.deadlineDay;
    } else if (base.deadlineDay != null && normalizedProgress.deadlineDay == null) {
      base.progress.deadlineDay = base.deadlineDay;
    }
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

function buildLegacyStudyInstance(definition, track, progress, state) {
  if (!definition || !track || !progress) {
    return null;
  }

  const acceptedOn = Number(progress.enrolledOnDay);
  const fallbackDay = Math.max(1, Math.floor(Number(state?.day) || 1));
  const acceptedOnDay = Number.isFinite(acceptedOn) && acceptedOn > 0 ? Math.floor(acceptedOn) : fallbackDay;
  const hoursPerDay = Number(track.hoursPerDay) || Number(definition?.progress?.hoursPerDay) || 0;
  const daysRequired = Number(track.days) || Number(definition?.progress?.daysRequired) || 0;
  const recordedDays = Math.max(0, Math.floor(Number(progress.daysCompleted) || 0));
  const cappedDays = daysRequired > 0 ? Math.min(recordedDays, daysRequired) : recordedDays;
  const hoursLogged = hoursPerDay > 0 ? hoursPerDay * cappedDays : cappedDays;
  const status = progress.completed ? 'completed' : progress.enrolled ? 'active' : 'pending';

  const overrides = {
    accepted: Boolean(progress.enrolled || progress.completed),
    acceptedOnDay,
    status,
    hoursRequired: definition?.progress?.hoursRequired ?? null,
    hoursLogged,
    completed: Boolean(progress.completed)
  };

  if (progress.completed) {
    const completedOn = Number(progress.completedOnDay);
    overrides.completedOnDay = Number.isFinite(completedOn) && completedOn > 0
      ? Math.floor(completedOn)
      : Math.max(acceptedOnDay + cappedDays - 1, acceptedOnDay);
  }

  const requiredHours = hoursPerDay > 0 ? hoursPerDay : 1;
  const dailyLog = {};
  for (let dayOffset = 0; dayOffset < cappedDays; dayOffset += 1) {
    dailyLog[acceptedOnDay + dayOffset] = requiredHours;
  }

  const stateDay = Math.max(1, Math.floor(Number(state?.day) || acceptedOnDay));
  if (!progress.completed && progress.studiedToday) {
    dailyLog[stateDay] = requiredHours;
  }

  overrides.progress = {
    type: definition?.progress?.type || 'study',
    completion: definition?.progress?.completion || 'manual',
    hoursPerDay: hoursPerDay > 0 ? hoursPerDay : null,
    daysRequired: daysRequired > 0 ? daysRequired : null,
    daysCompleted: cappedDays,
    dailyLog,
    hoursLogged,
    lastWorkedDay: progress.studiedToday
      ? stateDay
      : cappedDays > 0
        ? acceptedOnDay + cappedDays - 1
        : null,
    completed: Boolean(progress.completed)
  };

  if (progress.completed) {
    overrides.progress.completedOnDay = overrides.completedOnDay;
  }

  return normalizeActionInstance(definition, overrides, { state });
}

function seedKnowledgeStudyInstances({ state, sliceState }) {
  const knowledge = state?.progress?.knowledge;
  if (!knowledge || typeof knowledge !== 'object') {
    return;
  }

  for (const [trackId, progress] of Object.entries(knowledge)) {
    if (!progress) continue;
    const definitionId = `study-${trackId}`;
    const definition = resolveDefinition(definitionId);
    if (!definition) continue;
    const entry = sliceState[definitionId];
    if (!entry) continue;
    const hasActiveInstance = Array.isArray(entry.instances)
      && entry.instances.some(instance => instance?.accepted || instance?.completed);
    if (hasActiveInstance) continue;

    const track = KNOWLEDGE_TRACKS[trackId];
    const instance = buildLegacyStudyInstance(definition, track, progress, state);
    if (instance) {
      entry.instances.push(instance);
    }
  }
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

  seedKnowledgeStudyInstances({ state, sliceState });
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
