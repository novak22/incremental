import { formatHours } from '../../core/helpers.js';
import { clampToZero } from './utils.js';
import {
  DEFAULT_FOCUS_BUCKET,
  getFocusBucketComparator,
  getFocusModeConfig
} from './focusBuckets.js';

const BUCKET_ALIASES = new Map([
  ['education', 'study']
]);

const METRIC_KEYS = [
  'emptyMessage',
  'buttonClass',
  'defaultLabel',
  'hoursAvailable',
  'hoursAvailableLabel',
  'hoursSpent',
  'hoursSpentLabel',
  'moneyAvailable',
  'inProgressEntries'
];

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

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

export function resolveFocusBucket(entry = {}) {
  if (!entry || typeof entry !== 'object') {
    return DEFAULT_FOCUS_BUCKET;
  }
  const explicit = normalizeBucketName(entry.focusBucket);
  if (explicit) {
    return explicit;
  }
  const category = normalizeBucketName(entry.focusCategory);
  if (category) {
    return category;
  }
  return DEFAULT_FOCUS_BUCKET;
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

export function compareByRoi(a = {}, b = {}) {
  const roiA = Number.isFinite(a?.moneyPerHour)
    ? a.moneyPerHour
    : (() => {
        const payout = Number.isFinite(a?.payout) ? a.payout : 0;
        const duration = Number.isFinite(a?.durationHours) && a.durationHours > 0 ? a.durationHours : null;
        return duration ? payout / duration : payout;
      })();
  const roiB = Number.isFinite(b?.moneyPerHour)
    ? b.moneyPerHour
    : (() => {
        const payout = Number.isFinite(b?.payout) ? b.payout : 0;
        const duration = Number.isFinite(b?.durationHours) && b.durationHours > 0 ? b.durationHours : null;
        return duration ? payout / duration : payout;
      })();

  if (roiA !== roiB) {
    return roiB - roiA;
  }

  const payoutA = Number.isFinite(a?.payout) ? a.payout : 0;
  const payoutB = Number.isFinite(b?.payout) ? b.payout : 0;
  if (payoutA !== payoutB) {
    return payoutB - payoutA;
  }

  const durationA = Number.isFinite(a?.durationHours) ? a.durationHours : Infinity;
  const durationB = Number.isFinite(b?.durationHours) ? b.durationHours : Infinity;
  if (durationA !== durationB) {
    return durationA - durationB;
  }

  const orderA = Number.isFinite(a?.orderIndex) ? a.orderIndex : 0;
  const orderB = Number.isFinite(b?.orderIndex) ? b.orderIndex : 0;
  return orderA - orderB;
}

export function rankEntriesByRoi(entries = []) {
  if (!Array.isArray(entries) || entries.length <= 1) {
    return Array.isArray(entries) ? [...entries] : [];
  }
  return [...entries].sort(compareByRoi);
}

export function buildQueueMetrics(state = {}, overrides = {}) {
  const metrics = {};
  METRIC_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      metrics[key] = overrides[key];
    }
  });

  let hoursAvailable = toFiniteNumber(metrics.hoursAvailable);
  if (hoursAvailable == null) {
    hoursAvailable = toFiniteNumber(state?.timeLeft);
  }
  if (hoursAvailable != null) {
    hoursAvailable = clampToZero(hoursAvailable);
    metrics.hoursAvailable = hoursAvailable;
  } else {
    delete metrics.hoursAvailable;
  }

  let hoursSpent = toFiniteNumber(metrics.hoursSpent);
  if (hoursSpent == null && hoursAvailable != null) {
    const baseHours = clampToZero(state?.baseTime)
      + clampToZero(state?.bonusTime)
      + clampToZero(state?.dailyBonusTime);
    hoursSpent = Math.max(0, baseHours - hoursAvailable);
  }
  if (hoursSpent != null) {
    hoursSpent = clampToZero(hoursSpent);
    metrics.hoursSpent = hoursSpent;
  } else {
    delete metrics.hoursSpent;
  }

  if (!Object.prototype.hasOwnProperty.call(metrics, 'hoursAvailableLabel') && hoursAvailable != null) {
    metrics.hoursAvailableLabel = formatHours(hoursAvailable);
  }
  if (!Object.prototype.hasOwnProperty.call(metrics, 'hoursSpentLabel') && hoursSpent != null) {
    metrics.hoursSpentLabel = formatHours(hoursSpent);
  }

  let moneyAvailable = toFiniteNumber(metrics.moneyAvailable);
  if (moneyAvailable == null) {
    moneyAvailable = toFiniteNumber(state?.money);
  }
  if (moneyAvailable != null) {
    moneyAvailable = clampToZero(moneyAvailable);
    metrics.moneyAvailable = moneyAvailable;
  } else {
    delete metrics.moneyAvailable;
  }

  return metrics;
}

export function mergeQueueMetrics(target = {}, metrics = {}, state = {}) {
  if (!target || typeof target !== 'object' || !metrics || typeof metrics !== 'object') {
    return target;
  }

  const resolved = buildQueueMetrics(state, metrics);
  METRIC_KEYS.forEach(key => {
    if (resolved[key] == null) {
      return;
    }
    if (target[key] == null) {
      target[key] = resolved[key];
    }
  });

  if (!target.scroller && metrics.scroller) {
    target.scroller = metrics.scroller;
  }

  return target;
}

export default {
  normalizeBucketName,
  resolveFocusBucket,
  collectBuckets,
  sortBuckets,
  applyFocusOrdering,
  groupEntriesByTaskGroup,
  compareByRoi,
  rankEntriesByRoi,
  buildQueueMetrics,
  mergeQueueMetrics
};
