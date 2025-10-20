import { structuredClone } from '../../../core/helpers.js';
import { acceptActionInstance } from '../progress/instances.js';

function findFirstNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return null;
}

function cloneMarketMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  try {
    return structuredClone(metadata);
  } catch (_error) {
    // Fallback to a shallow copy if structuredClone cannot serialize the object.
    return { ...metadata };
  }
}

function mergeMarketMetadata(base, overrides) {
  const baseClone = cloneMarketMetadata(base);
  const overrideClone = cloneMarketMetadata(overrides);
  if (!baseClone) return overrideClone;
  if (!overrideClone) return baseClone;
  const merged = { ...baseClone, ...overrideClone };
  if (baseClone.metadata || overrideClone.metadata) {
    merged.metadata = {
      ...(baseClone.metadata || {}),
      ...(overrideClone.metadata || {})
    };
  }
  if (overrideClone.variants) {
    merged.variants = overrideClone.variants;
  } else if (baseClone.variants) {
    merged.variants = baseClone.variants;
  }
  return merged;
}

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

function normalizeTimeDescriptor(template, progress = {}) {
  const hoursRequired = findFirstNumber(
    progress.hoursRequired,
    template.time,
    template.action?.timeCost
  );
  const descriptor = {};
  if (hoursRequired != null) {
    descriptor.hours = hoursRequired;
  }
  if (Number.isFinite(progress.hoursPerDay) && progress.hoursPerDay > 0) {
    descriptor.hoursPerDay = progress.hoursPerDay;
  }
  if (Number.isFinite(progress.daysRequired) && progress.daysRequired > 0) {
    descriptor.daysRequired = Math.floor(progress.daysRequired);
  }
  if (progress.deadlineDay != null) {
    descriptor.deadlineDay = Math.max(1, Math.floor(Number(progress.deadlineDay)) || 1);
  }
  return Object.keys(descriptor).length ? descriptor : null;
}

function normalizePayoutDescriptor(template) {
  const payout = template.payout || template.action?.payout;
  if (!payout || typeof payout !== 'object') {
    return null;
  }
  const amount = findFirstNumber(payout.amount, payout.value, payout.baseAmount);
  if (amount == null) {
    return null;
  }
  const descriptor = { amount };
  const delay = findFirstNumber(payout.delaySeconds, payout.waitSeconds, payout.delay);
  if (delay != null && delay > 0) {
    descriptor.delaySeconds = delay;
  }
  const schedule = payout.schedule || payout.payoutSchedule;
  descriptor.schedule = typeof schedule === 'string' && schedule.trim().length
    ? schedule
    : 'onCompletion';
  if (payout.grantOnAction != null) {
    descriptor.grantOnAction = payout.grantOnAction !== false;
  }
  if (typeof payout.logType === 'string' && payout.logType.trim()) {
    descriptor.logType = payout.logType;
  }
  return descriptor;
}

function normalizeAcceptHooks(options = {}) {
  const hooks = [];
  if (Array.isArray(options.hooks)) {
    for (const hook of options.hooks) {
      if (typeof hook === 'function') {
        hooks.push(hook);
      }
    }
  }
  if (typeof options.onAccepted === 'function') {
    hooks.push(options.onAccepted);
  }
  return hooks;
}

function normalizeCompletionHooks(options = {}) {
  const hooks = [];
  if (!options) {
    return hooks;
  }
  if (Array.isArray(options.hooks)) {
    for (const hook of options.hooks) {
      if (typeof hook === 'function') {
        hooks.push(hook);
      }
    }
  }
  if (typeof options.onCompleted === 'function') {
    hooks.push(options.onCompleted);
  }
  return hooks;
}

export function createContractTemplate(definition, options = {}) {
  const template = {
    ...definition,
    defaultState: cloneDefaultState(definition?.defaultState)
  };

  if (!template.kind) {
    template.kind = 'action';
  }

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

  const resolvedTemplateKind = options.templateKind ?? definition?.templateKind ?? template?.templateKind ?? null;
  if (resolvedTemplateKind) {
    template.templateKind = resolvedTemplateKind;
  }

  const resolvedCategory = options.category ?? definition?.category ?? template?.category ?? null;
  if (resolvedCategory) {
    template.category = resolvedCategory;
  } else if (template.category === undefined) {
    template.category = null;
  }

  const mergedMarket = mergeMarketMetadata(template.market, options.market);
  if (mergedMarket) {
    template.market = mergedMarket;
  } else {
    delete template.market;
  }

  const progressDescriptor = mergedProgress ? cloneProgress(mergedProgress) : null;
  const descriptors = typeof template.descriptors === 'object' && template.descriptors !== null
    ? { ...template.descriptors }
    : {};

  if (progressDescriptor) {
    descriptors.progress = progressDescriptor;
  }

  const timeDescriptor = normalizeTimeDescriptor(template, progressDescriptor || options.progress || {});
  if (timeDescriptor) {
    descriptors.time = timeDescriptor;
    if (timeDescriptor.hours != null) {
      template.time = timeDescriptor.hours;
    }
  } else if (template.time != null) {
    const resolvedTime = findFirstNumber(template.time, template.action?.timeCost, progressDescriptor?.hoursRequired);
    if (resolvedTime != null) {
      template.time = resolvedTime;
    }
  }

  const payoutDescriptor = normalizePayoutDescriptor(template);
  if (payoutDescriptor) {
    descriptors.payout = payoutDescriptor;
  }

  if (Object.keys(descriptors).length) {
    template.descriptors = descriptors;
  } else if (template.descriptors) {
    delete template.descriptors;
  }

  const baseAcceptOverrides = mergeOverrides(options.accept?.overrides, {});
  const acceptProgressDefaults = mergeProgress(options.accept?.progress, progressDefaults) || mergedProgress;
  const acceptHooks = normalizeAcceptHooks(options.accept);
  const completionHooks = normalizeCompletionHooks(options.complete);

  template.acceptInstance = ({ overrides = {}, ...rest } = {}) => {
    const combinedOverrides = mergeOverrides(baseAcceptOverrides, overrides);
    const progressOverride = mergeProgress(combinedOverrides.progress, acceptProgressDefaults);
    if (progressOverride) {
      combinedOverrides.progress = progressOverride;
    } else {
      delete combinedOverrides.progress;
    }
    const instance = acceptActionInstance(template, {
      ...rest,
      overrides: combinedOverrides
    });
    if (instance && acceptHooks.length) {
      const hookContext = {
        ...rest,
        definition: template,
        instance,
        overrides: combinedOverrides
      };
      for (const hook of acceptHooks) {
        hook(hookContext);
      }
    }
    return instance;
  };

  if (completionHooks.length) {
    template.__completionHooks = completionHooks;
  } else if (template.__completionHooks) {
    delete template.__completionHooks;
  }

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
    templateKind: options.templateKind ?? 'manual',
    category: options.category ?? definition?.category ?? 'study',
    progress: progressDefaults,
    availability
  });
}

