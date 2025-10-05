const DEFAULT_FOCUS_BUCKET = 'other';

const bucketComparators = new Map();
const focusModes = new Map();

const defaultBucketComparator = entries => entries.filter(Boolean);

bucketComparators.set(DEFAULT_FOCUS_BUCKET, defaultBucketComparator);

const defaultModes = {
  money: { order: ['hustle', 'upgrade'], interleave: [] },
  upgrades: { order: ['upgrade', 'hustle'], interleave: [] },
  balanced: { order: ['upgrade', 'hustle'], interleave: ['upgrade', 'hustle'] }
};

Object.entries(defaultModes).forEach(([mode, config]) => {
  focusModes.set(mode, {
    order: [...(config.order || [])],
    interleave: [...(config.interleave || [])]
  });
});

function cloneModeConfig(config = {}) {
  return {
    order: Array.isArray(config.order) ? [...config.order] : [],
    interleave: Array.isArray(config.interleave) ? [...config.interleave] : []
  };
}

function sanitizeBucketList(list) {
  if (!Array.isArray(list)) {
    return null;
  }
  const seen = new Set();
  const results = [];
  list.forEach(item => {
    if (typeof item !== 'string') {
      return;
    }
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    results.push(trimmed);
  });
  return results;
}

export function registerFocusBucket({ name, comparator, modes } = {}) {
  if (typeof name !== 'string') {
    return;
  }
  const trimmedName = name.trim();
  if (!trimmedName) {
    return;
  }

  if (comparator === null) {
    bucketComparators.delete(trimmedName);
  } else if (typeof comparator === 'function') {
    bucketComparators.set(trimmedName, comparator);
  }

  if (!modes || typeof modes !== 'object') {
    return;
  }

  Object.entries(modes).forEach(([modeName, modeConfig]) => {
    if (typeof modeName !== 'string') {
      return;
    }
    const trimmedMode = modeName.trim();
    if (!trimmedMode) {
      return;
    }

    const existing = cloneModeConfig(focusModes.get(trimmedMode) || {});
    const sanitizedOrder = sanitizeBucketList(modeConfig?.order);
    const sanitizedInterleave = sanitizeBucketList(modeConfig?.interleave);

    focusModes.set(trimmedMode, {
      order: sanitizedOrder ?? existing.order,
      interleave: sanitizedInterleave ?? existing.interleave
    });
  });
}

export function hasFocusBucket(name) {
  if (typeof name !== 'string') {
    return false;
  }
  return bucketComparators.has(name.trim());
}

export function getFocusBucketComparator(bucketName) {
  if (typeof bucketName === 'string') {
    const trimmedName = bucketName.trim();
    if (bucketComparators.has(trimmedName)) {
      return bucketComparators.get(trimmedName);
    }
  }
  return bucketComparators.get(DEFAULT_FOCUS_BUCKET);
}

export function getFocusModeConfig(modeName) {
  if (typeof modeName !== 'string') {
    return cloneModeConfig();
  }
  const trimmedMode = modeName.trim();
  if (!trimmedMode) {
    return cloneModeConfig();
  }
  const config = focusModes.get(trimmedMode);
  if (!config) {
    return null;
  }
  return cloneModeConfig(config);
}

export { DEFAULT_FOCUS_BUCKET };

export default {
  registerFocusBucket,
  getFocusBucketComparator,
  getFocusModeConfig,
  hasFocusBucket,
  DEFAULT_FOCUS_BUCKET
};
