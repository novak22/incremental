import {
  DEFAULT_FOCUS_BUCKET,
  getFocusBucketComparator,
  getFocusModeConfig
} from '../focusBuckets.js';

const BUCKET_ALIASES = new Map([
  ['education', 'study'],
  ['course', 'study'],
  ['training', 'study'],
  ['lesson', 'study'],
  ['class', 'study'],
  ['contract', 'hustle'],
  ['project', 'hustle'],
  ['gig', 'hustle'],
  ['work', 'hustle'],
  ['maintenance', 'commitment'],
  ['upkeep', 'commitment'],
  ['care', 'commitment'],
  ['support', 'commitment']
]);

export function normalizeBucketName(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  return BUCKET_ALIASES.get(trimmed) || trimmed;
}

export function resolveQueueCategory(...values) {
  for (const value of values) {
    const normalized = normalizeBucketName(value);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

export function resolveFocusBucket(entry = {}) {
  if (!entry || typeof entry !== 'object') {
    return DEFAULT_FOCUS_BUCKET;
  }
  return resolveQueueCategory(entry.focusBucket, entry.focusCategory) || DEFAULT_FOCUS_BUCKET;
}

export function collectBuckets(entries = []) {
  const buckets = new Map();
  (Array.isArray(entries) ? entries : [])
    .filter(Boolean)
    .forEach(entry => {
      const bucketName = resolveFocusBucket(entry);
      if (!buckets.has(bucketName)) {
        buckets.set(bucketName, []);
      }
      buckets.get(bucketName).push(entry);
    });
  return buckets;
}

export function sortBuckets(bucketMap = new Map()) {
  const sorted = new Map();
  bucketMap.forEach((bucketEntries, bucketName) => {
    const comparator = getFocusBucketComparator(bucketName);
    sorted.set(bucketName, comparator(bucketEntries));
  });
  return sorted;
}

function interleaveEntries(first = [], second = []) {
  const results = [];
  const max = Math.max(first.length, second.length);
  for (let index = 0; index < max; index += 1) {
    if (first[index]) {
      results.push(first[index]);
    }
    if (second[index]) {
      results.push(second[index]);
    }
  }
  return results;
}

export function applyFocusOrdering(entries = [], mode = 'balanced') {
  if (!Array.isArray(entries) || entries.length === 0) {
    return entries;
  }

  const buckets = collectBuckets(entries);
  if (buckets.size === 0) {
    return entries;
  }

  const sortedBuckets = sortBuckets(buckets);
  const resolvedModeConfig = (() => {
    const direct = getFocusModeConfig(mode);
    if (direct) {
      return direct;
    }
    if (mode !== 'balanced') {
      const fallback = getFocusModeConfig('balanced');
      if (fallback) {
        return fallback;
      }
    }
    return { order: [], interleave: [] };
  })();
  const order = Array.isArray(resolvedModeConfig?.order) ? resolvedModeConfig.order : [];
  const interleaveBuckets = Array.isArray(resolvedModeConfig?.interleave)
    ? resolvedModeConfig.interleave
    : [];

  const results = [];
  const usedEntries = new Set();

  const addEntry = entry => {
    if (!entry || usedEntries.has(entry)) {
      return;
    }
    usedEntries.add(entry);
    results.push(entry);
  };

  const processedBuckets = new Set();

  if (interleaveBuckets.length > 0) {
    let interleaved = [];
    interleaveBuckets.forEach((bucketName, index) => {
      const bucketEntries = sortedBuckets.get(bucketName) || [];
      processedBuckets.add(bucketName);
      if (index === 0) {
        interleaved = [...bucketEntries];
      } else {
        interleaved = interleaveEntries(interleaved, bucketEntries);
      }
    });
    interleaved.forEach(addEntry);
  }

  order.forEach(bucketName => {
    processedBuckets.add(bucketName);
    const bucketEntries = sortedBuckets.get(bucketName) || [];
    bucketEntries.forEach(addEntry);
  });

  sortedBuckets.forEach((bucketEntries, bucketName) => {
    if (processedBuckets.has(bucketName)) {
      return;
    }
    bucketEntries.forEach(addEntry);
  });

  return results;
}

export function groupEntriesByTaskGroup(entries = [], options = {}) {
  const groupConfigsRaw = Array.isArray(options?.groupConfigs) && options.groupConfigs.length
    ? options.groupConfigs
    : [{ key: DEFAULT_FOCUS_BUCKET, buckets: [DEFAULT_FOCUS_BUCKET] }];
  const groupConfigs = groupConfigsRaw.map(config => {
    const buckets = Array.isArray(config?.buckets) && config.buckets.length
      ? config.buckets.map(normalizeBucketName).filter(Boolean)
      : [normalizeBucketName(config?.key) || config?.key || DEFAULT_FOCUS_BUCKET];
    return {
      ...config,
      buckets,
      normalizedKey: normalizeBucketName(config?.key) || config?.key || DEFAULT_FOCUS_BUCKET
    };
  });

  const fallbackConfig = groupConfigs.find(config => config.buckets.includes(DEFAULT_FOCUS_BUCKET))
    || groupConfigs[groupConfigs.length - 1];

  const grouped = groupConfigs.reduce((map, config) => {
    map[config.key] = [];
    return map;
  }, {});

  const sortedBuckets = sortBuckets(collectBuckets(entries));
  sortedBuckets.forEach((bucketEntries, bucketName) => {
    const normalizedBucket = normalizeBucketName(bucketName) || DEFAULT_FOCUS_BUCKET;
    const targetConfig = groupConfigs.find(config => config.buckets.includes(normalizedBucket))
      || fallbackConfig;
    if (!grouped[targetConfig.key]) {
      grouped[targetConfig.key] = [];
    }
    grouped[targetConfig.key].push(...bucketEntries);
  });

  return grouped;
}

export default {
  normalizeBucketName,
  resolveQueueCategory,
  resolveFocusBucket,
  collectBuckets,
  sortBuckets,
  applyFocusOrdering,
  groupEntriesByTaskGroup
};
