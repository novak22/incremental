import { acceptActionInstance } from '../progress.js';

function cloneDefaultState(defaultState = {}) {
  const base = typeof defaultState === 'object' && defaultState !== null
    ? { ...defaultState }
    : {};
  if (!Array.isArray(base.instances)) {
    base.instances = [];
  } else {
    base.instances = base.instances.map(instance => ({ ...instance }));
  }
  return base;
}

function normalizeDailyLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.max(1, Math.floor(parsed));
}

function resolveAvailability(definition, options = {}) {
  if (definition.availability) {
    return { ...definition.availability };
  }
  if (options.availability) {
    return { ...options.availability };
  }
  const limit = normalizeDailyLimit(options.dailyLimit ?? definition.dailyLimit);
  if (limit) {
    return { type: 'dailyLimit', limit };
  }
  return { type: 'always' };
}

function resolveExpiry(definition, options = {}) {
  if (definition.expiry) {
    return { ...definition.expiry };
  }
  if (options.expiry) {
    return { ...options.expiry };
  }
  return { type: 'permanent' };
}

function cloneProgress(progress = {}) {
  if (typeof progress !== 'object' || progress === null) {
    return {};
  }
  return { ...progress };
}

function mergeProgress(baseProgress, defaults = {}) {
  const base = cloneProgress(baseProgress);
  const fallback = cloneProgress(defaults);
  const merged = { ...fallback, ...base };
  const keys = Object.keys(merged);
  if (keys.length === 0) {
    return null;
  }

  if (!merged.type) {
    merged.type = fallback.type || 'instant';
  }
  if (!merged.completion) {
    if (fallback.completion) {
      merged.completion = fallback.completion;
    } else {
      merged.completion = merged.type === 'instant' ? 'instant' : 'deferred';
    }
  }

  const numericFields = ['hoursRequired', 'hoursPerDay', 'daysRequired', 'deadlineDay'];
  for (const field of numericFields) {
    if (merged[field] == null && fallback[field] != null) {
      merged[field] = fallback[field];
    }
  }

  if (merged.label == null && fallback.label != null) {
    merged.label = fallback.label;
  }

  return merged;
}

function mergeOverrides(baseOverrides = {}, incomingOverrides = {}) {
  const merged = { ...baseOverrides, ...incomingOverrides };
  if (baseOverrides.progress || incomingOverrides.progress) {
    merged.progress = {
      ...(typeof baseOverrides.progress === 'object' && baseOverrides.progress !== null
        ? baseOverrides.progress
        : {}),
      ...(typeof incomingOverrides.progress === 'object' && incomingOverrides.progress !== null
        ? incomingOverrides.progress
        : {})
    };
  }
  return merged;
}

export function createContractTemplate(definition, options = {}) {
  const template = {
    ...definition,
    defaultState: cloneDefaultState(definition?.defaultState)
  };

  const normalizedLimit = normalizeDailyLimit(options.dailyLimit ?? template.dailyLimit);
  template.dailyLimit = normalizedLimit;

  template.availability = resolveAvailability(template, {
    ...options,
    dailyLimit: normalizedLimit
  });
  template.expiry = resolveExpiry(template, options);

  const progressDefaults = options.progress || {};
  const mergedProgress = mergeProgress(template.progress, progressDefaults);
  if (mergedProgress) {
    template.progress = mergedProgress;
  } else {
    delete template.progress;
  }

  const baseAcceptOverrides = mergeOverrides(options.accept?.overrides, {});
  const acceptProgressDefaults = mergeProgress(options.accept?.progress, progressDefaults) || mergedProgress;

  template.acceptInstance = ({ overrides = {}, ...rest } = {}) => {
    const combinedOverrides = mergeOverrides(baseAcceptOverrides, overrides);
    const progressOverride = mergeProgress(combinedOverrides.progress, acceptProgressDefaults);
    if (progressOverride) {
      combinedOverrides.progress = progressOverride;
    } else {
      delete combinedOverrides.progress;
    }
    return acceptActionInstance(template, {
      ...rest,
      overrides: combinedOverrides
    });
  };

  return template;
}

export function createStudyTemplate(definition, options = {}) {
  const progressDefaults = {
    type: 'study',
    completion: 'manual',
    ...options.progress
  };
  const availability = options.availability || { type: 'enrollable' };
  return createContractTemplate(definition, {
    ...options,
    progress: progressDefaults,
    availability
  });
}

export function mergeContractProgress(progress, defaults) {
  return mergeProgress(progress, defaults);
}
