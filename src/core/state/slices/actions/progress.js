import { toNumber } from '../../../helpers.js';

export function normalizeProgressLog(log = {}) {
  const normalized = {};
  for (const [dayKey, value] of Object.entries(log || {})) {
    const day = Math.max(1, Math.floor(Number(dayKey)) || 1);
    const hours = Number(value);
    if (!Number.isFinite(hours) || hours < 0) continue;
    normalized[day] = Number.isFinite(normalized[day]) ? normalized[day] + hours : hours;
  }
  return normalized;
}

export function normalizeInstanceProgress(definition, instance = {}) {
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

export function getInstanceProgressSnapshot(instance = {}) {
  if (!instance || typeof instance !== 'object') {
    return null;
  }

  const progress = typeof instance.progress === 'object' && instance.progress !== null
    ? instance.progress
    : {};

  const snapshot = {};

  snapshot.definitionId = typeof instance.definitionId === 'string'
    ? instance.definitionId
    : typeof progress.definitionId === 'string'
      ? progress.definitionId
      : null;

  snapshot.instanceId = typeof instance.id === 'string'
    ? instance.id
    : typeof progress.instanceId === 'string'
      ? progress.instanceId
      : null;

  const resolvedHoursLogged = toNumber(progress.hoursLogged, toNumber(instance.hoursLogged, 0));
  snapshot.hoursLogged = Number.isFinite(resolvedHoursLogged) && resolvedHoursLogged >= 0
    ? resolvedHoursLogged
    : 0;

  const hoursRequiredCandidates = [
    progress.hoursRequired,
    instance.hoursRequired,
    progress.totalHours
  ];
  let hoursRequired = null;
  for (const candidate of hoursRequiredCandidates) {
    const numeric = toNumber(candidate, null);
    if (Number.isFinite(numeric) && numeric >= 0) {
      hoursRequired = numeric;
      break;
    }
  }
  snapshot.hoursRequired = hoursRequired;

  snapshot.hoursRemaining = snapshot.hoursRequired != null
    ? Math.max(0, snapshot.hoursRequired - snapshot.hoursLogged)
    : null;

  const parsedHoursPerDay = toNumber(progress.hoursPerDay, null);
  snapshot.hoursPerDay = Number.isFinite(parsedHoursPerDay) && parsedHoursPerDay > 0
    ? parsedHoursPerDay
    : null;

  const parsedDaysCompleted = toNumber(progress.daysCompleted, null);
  snapshot.daysCompleted = Number.isFinite(parsedDaysCompleted) && parsedDaysCompleted >= 0
    ? Math.floor(parsedDaysCompleted)
    : 0;

  const parsedDaysRequired = toNumber(progress.daysRequired, null);
  snapshot.daysRequired = Number.isFinite(parsedDaysRequired) && parsedDaysRequired > 0
    ? Math.floor(parsedDaysRequired)
    : null;

  const progressType = typeof progress.type === 'string' && progress.type.trim()
    ? progress.type.trim()
    : null;
  snapshot.type = progressType;

  const completionCandidates = [progress.completion, progress.completionMode];
  let completionMode = null;
  for (const candidate of completionCandidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      completionMode = candidate.trim();
      break;
    }
  }
  if (!completionMode) {
    completionMode = progressType === 'instant' ? 'instant' : 'manual';
  }
  snapshot.completion = completionMode;
  snapshot.completionMode = completionMode;

  snapshot.percentComplete = snapshot.hoursRequired && snapshot.hoursRequired > 0
    ? Math.max(0, Math.min(1, snapshot.hoursLogged / snapshot.hoursRequired))
    : null;

  const parsedLastWorked = toNumber(progress.lastWorkedDay, null);
  snapshot.lastWorkedDay = Number.isFinite(parsedLastWorked) && parsedLastWorked > 0
    ? Math.floor(parsedLastWorked)
    : null;

  const parsedDeadline = toNumber(progress.deadlineDay, null);
  snapshot.deadlineDay = Number.isFinite(parsedDeadline) && parsedDeadline > 0
    ? Math.floor(parsedDeadline)
    : null;

  const parsedAcceptedOn = toNumber(progress.acceptedOnDay ?? instance.acceptedOnDay, null);
  snapshot.acceptedOnDay = Number.isFinite(parsedAcceptedOn) && parsedAcceptedOn > 0
    ? Math.floor(parsedAcceptedOn)
    : null;

  const completed = progress.completed === true
    || instance.completed === true
    || progress.status === 'completed'
    || instance.status === 'completed';
  snapshot.completed = completed;

  const parsedCompletedOn = toNumber(progress.completedOnDay ?? instance.completedOnDay, null);
  snapshot.completedOnDay = Number.isFinite(parsedCompletedOn) && parsedCompletedOn > 0
    ? Math.floor(parsedCompletedOn)
    : completed
      ? snapshot.acceptedOnDay
      : null;

  snapshot.metadata = typeof progress.metadata === 'object' && progress.metadata !== null
    ? progress.metadata
    : {};

  if (progress.dailyLog && typeof progress.dailyLog === 'object') {
    snapshot.dailyLog = progress.dailyLog;
  }

  return snapshot;
}
