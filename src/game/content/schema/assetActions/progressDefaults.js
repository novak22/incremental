export function buildProgressDefaults({ metadata, config }) {
  const progressDefaults = {
    type: 'instant',
    completion: 'instant',
    ...(config.progress || {})
  };

  if (progressDefaults.hoursRequired == null) {
    const baseHours = Number(metadata.time);
    if (Number.isFinite(baseHours) && baseHours >= 0) {
      progressDefaults.hoursRequired = baseHours;
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
