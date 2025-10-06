export function buildProgressDefaults({ metadata, config }) {
  const suppliedProgress = typeof config.progress === 'object' && config.progress !== null
    ? { ...config.progress }
    : {};

  const progressDefaults = { ...suppliedProgress };
  progressDefaults.type = suppliedProgress.type || 'hustle';
  progressDefaults.completion = suppliedProgress.completion || (metadata.time > 0 ? 'manual' : 'instant');

  if (suppliedProgress.hoursRequired != null) {
    progressDefaults.hoursRequired = suppliedProgress.hoursRequired;
  } else {
    const baseHours = Number(metadata.time);
    if (Number.isFinite(baseHours) && baseHours >= 0) {
      progressDefaults.hoursRequired = baseHours;
    }
  }

  const additionalKeys = [
    'hoursPerDay',
    'daysRequired',
    'deadlineDay',
    'label',
    'completionMode',
    'progressLabel'
  ];
  for (const key of additionalKeys) {
    if (suppliedProgress[key] != null) {
      progressDefaults[key] = suppliedProgress[key];
    }
  }

  return progressDefaults;
}

export function buildDefaultState({ config, metadata }) {
  const base = { ...(config.defaultState || {}) };
  if (!Array.isArray(base.instances)) {
    base.instances = [];
  }
  if (metadata.dailyLimit) {
    if (typeof base.runsToday !== 'number') base.runsToday = 0;
    if (typeof base.lastRunDay !== 'number') base.lastRunDay = 0;
  }
  return base;
}
