import { toNumber } from '../../../core/helpers.js';

const FLOAT_PRECISION = 4;

export function roundHours(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const factor = 10 ** FLOAT_PRECISION;
  return Math.round(number * factor) / factor;
}

function ensureProgressTemplate(definition) {
  if (!definition?.progress || typeof definition.progress !== 'object') {
    return {};
  }
  return definition.progress;
}

export function resolveProgressField(value, fallback) {
  const parsed = toNumber(value, null);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

function resolveProgressString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function normalizeProgressLog(log = {}) {
  const normalized = {};
  for (const [dayKey, hoursValue] of Object.entries(log)) {
    const day = Math.max(1, Math.floor(Number(dayKey)) || 1);
    const hours = Number(hoursValue);
    if (!Number.isFinite(hours) || hours < 0) continue;
    const existing = normalized[day] || 0;
    normalized[day] = roundHours(existing + hours);
  }
  return normalized;
}

export function createInstanceProgress(definition, { state, overrides = {}, metadata = {} } = {}) {
  const template = ensureProgressTemplate(definition);
  const supplied = typeof overrides.progress === 'object' && overrides.progress !== null
    ? overrides.progress
    : {};

  const progress = {};

  progress.type = supplied.type || template.type || 'instant';
  progress.completion = supplied.completion || template.completion || 'instant';

  const hoursRequiredTemplate = resolveProgressField(template.hoursRequired, null);
  const hoursRequiredOverride = resolveProgressField(supplied.hoursRequired, null);
  const hoursRequired = hoursRequiredOverride != null
    ? hoursRequiredOverride
    : hoursRequiredTemplate != null
      ? hoursRequiredTemplate
      : resolveProgressField(overrides.hoursRequired, null);
  if (hoursRequired != null && hoursRequired >= 0) {
    progress.hoursRequired = roundHours(hoursRequired);
  }

  const templateHoursPerDay = resolveProgressField(template.hoursPerDay, null);
  const suppliedHoursPerDay = resolveProgressField(supplied.hoursPerDay, null);
  const hoursPerDay = suppliedHoursPerDay != null ? suppliedHoursPerDay : templateHoursPerDay;
  progress.hoursPerDay = Number.isFinite(hoursPerDay) && hoursPerDay > 0 ? roundHours(hoursPerDay) : null;

  const templateDaysRequired = resolveProgressField(template.daysRequired, null);
  const suppliedDaysRequired = resolveProgressField(supplied.daysRequired, null);
  const daysRequired = suppliedDaysRequired != null ? suppliedDaysRequired : templateDaysRequired;
  progress.daysRequired = Number.isFinite(daysRequired) && daysRequired > 0 ? Math.floor(daysRequired) : null;

  let deadline = supplied.deadlineDay;
  if (deadline == null) {
    deadline = typeof template.deadlineDay === 'function'
      ? template.deadlineDay({ definition, state, metadata, overrides })
      : template.deadlineDay;
  }
  if (deadline == null) {
    deadline = overrides.deadlineDay;
  }
  if (deadline != null) {
    const parsedDeadline = Math.max(1, Math.floor(Number(deadline)) || 1);
    progress.deadlineDay = parsedDeadline;
  } else {
    progress.deadlineDay = null;
  }

  progress.dailyLog = {};
  progress.daysCompleted = 0;
  progress.hoursLogged = 0;
  progress.lastWorkedDay = null;
  progress.completed = false;

  const metadataProgress = typeof metadata?.progress === 'object' && metadata.progress !== null
    ? metadata.progress
    : {};
  const label = resolveProgressString(
    supplied.label,
    metadata?.progressLabel,
    metadataProgress.label
  );
  if (label) {
    progress.label = label;
  }
  const completionModeValue = resolveProgressString(
    supplied.completionMode,
    metadataProgress.completionMode,
    metadataProgress.completion,
    overrides?.completionMode,
    template.completionMode,
    progress.completion
  );
  if (completionModeValue) {
    Object.defineProperty(progress, 'completionMode', {
      value: completionModeValue,
      enumerable: true,
      configurable: true,
      writable: true
    });
    if (!progress.completion) {
      progress.completion = completionModeValue;
    }
  } else if (progress.completion && !progress.completionMode) {
    progress.completionMode = progress.completion;
  }

  return progress;
}
