import { formatHours } from '../../core/helpers.js';
import { addLog } from '../../core/log.js';
import { getState } from '../../core/state.js';
import { advanceActionInstance, completeActionInstance } from '../../game/actions/progress.js';
import { getActionDefinition } from '../../game/registryService.js';
import { spendTime } from '../../game/time.js';
import { allocateDailyStudy } from '../../game/requirements.js';
import { checkDayEnd } from '../../game/lifecycle.js';
import {
  DEFAULT_FOCUS_BUCKET,
  getFocusBucketComparator,
  getFocusModeConfig,
  registerFocusBucket
} from './focusBuckets.js';

export const DEFAULT_TODO_EMPTY_MESSAGE = 'Queue a hustle or upgrade to add new tasks.';

export const TASK_GROUP_CONFIGS = [
  {
    key: 'hustle',
    label: 'Hustles queued',
    empty: 'Line up a gig to stack this lane.',
    buckets: ['hustle']
  },
  {
    key: 'upgrade',
    label: 'Upgrades to trigger',
    empty: 'Queue an upgrade to keep momentum.',
    buckets: ['upgrade']
  },
  {
    key: 'study',
    label: 'Study & training',
    empty: 'No study blocks queued yet.',
    buckets: ['study', 'education']
  },
  {
    key: 'other',
    label: 'Assist & extras',
    empty: 'No support tasks waiting on you.',
    buckets: ['other', 'commitment', 'assist', 'support']
  }
];

const BUCKET_ALIASES = new Map([
  ['education', 'study']
]);

function sortHustleEntries(entries = []) {
  return [...entries].sort((a, b) => {
    const roiA = Number.isFinite(a?.moneyPerHour) ? a.moneyPerHour : -Infinity;
    const roiB = Number.isFinite(b?.moneyPerHour) ? b.moneyPerHour : -Infinity;
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
  });
}

function sortUpgradeEntries(entries = []) {
  return [...entries].sort((a, b) => {
    const remainingA = Number.isFinite(a?.upgradeRemaining) ? a.upgradeRemaining : Infinity;
    const remainingB = Number.isFinite(b?.upgradeRemaining) ? b.upgradeRemaining : Infinity;
    if (remainingA !== remainingB) {
      return remainingA - remainingB;
    }
    const durationA = Number.isFinite(a?.durationHours) ? a.durationHours : Infinity;
    const durationB = Number.isFinite(b?.durationHours) ? b.durationHours : Infinity;
    if (durationA !== durationB) {
      return durationA - durationB;
    }
    const orderA = Number.isFinite(a?.orderIndex) ? a.orderIndex : 0;
    const orderB = Number.isFinite(b?.orderIndex) ? b.orderIndex : 0;
    return orderA - orderB;
  });
}

function sortCommitmentEntries(entries = []) {
  return [...entries].sort((a, b) => {
    const remainingA = Number.isFinite(a?.progress?.remainingDays)
      ? a.progress.remainingDays
      : Infinity;
    const remainingB = Number.isFinite(b?.progress?.remainingDays)
      ? b.progress.remainingDays
      : Infinity;
    if (remainingA !== remainingB) {
      return remainingA - remainingB;
    }
    const payoutA = Number.isFinite(a?.payout) ? a.payout : 0;
    const payoutB = Number.isFinite(b?.payout) ? b.payout : 0;
    if (payoutA !== payoutB) {
      return payoutB - payoutA;
    }
    const orderA = Number.isFinite(a?.orderIndex) ? a.orderIndex : 0;
    const orderB = Number.isFinite(b?.orderIndex) ? b.orderIndex : 0;
    return orderA - orderB;
  });
}

registerFocusBucket({
  name: 'commitment',
  comparator: sortCommitmentEntries,
  modes: {
    money: { order: ['commitment', 'hustle', 'upgrade'] },
    upgrades: { order: ['commitment', 'upgrade', 'hustle'] },
    balanced: {
      order: ['commitment', 'upgrade', 'hustle'],
      interleave: ['commitment', 'upgrade', 'hustle']
    }
  }
});
registerFocusBucket({ name: 'hustle', comparator: sortHustleEntries });
registerFocusBucket({ name: 'upgrade', comparator: sortUpgradeEntries });

function normalizeBucketName(value) {
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
    : TASK_GROUP_CONFIGS;
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
    grouped[targetConfig.key].push(...bucketEntries);
  });

  return grouped;
}

function resolveProgressStep(entry = {}) {
  const progress = entry?.progress || {};
  const rawStep = Number(progress.stepHours);
  if (Number.isFinite(rawStep) && rawStep > 0) {
    const remaining = Number(progress.hoursRemaining);
    if (Number.isFinite(remaining) && remaining >= 0) {
      return Math.max(0, Math.min(rawStep, remaining));
    }
    return rawStep;
  }

  const duration = Number(entry?.durationHours);
  if (Number.isFinite(duration) && duration > 0) {
    return duration;
  }
  return 0;
}

export function createProgressHandler(entry = {}) {
  const progress = entry?.progress || {};
  const definitionId = progress.definitionId || entry?.definitionId;
  const instanceId = progress.instanceId || entry?.instanceId;
  if (!definitionId || !instanceId) {
    return null;
  }

  return () => {
    const definition = getActionDefinition(definitionId);
    if (!definition) {
      return { success: false };
    }

    const metadata = progress.metadata;
    const remaining = Number(progress.hoursRemaining);
    const step = resolveProgressStep(entry);

    const requiresManualCompletion = progress.completion === 'manual';
    const hasRemaining = Number.isFinite(remaining) ? remaining > 0 : true;
    const amount = step > 0 ? step : Math.max(0, remaining);

    if (requiresManualCompletion && (!hasRemaining || amount <= 0)) {
      completeActionInstance(definition, { id: instanceId }, { metadata });
      return { success: true, hours: 0, completed: true };
    }

    const hours = amount > 0 ? amount : step;
    if (!Number.isFinite(hours) || hours <= 0) {
      completeActionInstance(definition, { id: instanceId }, { metadata });
      return { success: true, hours: 0, completed: true };
    }

    const state = getState();
    const available = Number(state?.timeLeft);
    if (Number.isFinite(available) && available < hours) {
      if (typeof addLog === 'function') {
        addLog(
          `You need ${formatHours(hours)} focus free before logging that commitment. Wrap another task first or rest up.`,
          'warning'
        );
      }
      return { success: false };
    }

    spendTime(hours);
    advanceActionInstance(definition, { id: instanceId }, { hours, metadata });

    const isStudy =
      definition.studyTrackId ||
      definition?.progress?.type === 'study' ||
      progress?.type === 'study';
    if (isStudy) {
      const resolvedTrackId = (() => {
        const directIdCandidates = [
          definition.studyTrackId,
          progress?.studyTrackId,
          progress?.trackId,
          definition?.progress?.studyTrackId,
          definition?.progress?.trackId
        ].filter(id => typeof id === 'string' && id.trim().length > 0);
        if (directIdCandidates.length > 0) {
          return directIdCandidates[0];
        }
        const stripStudyPrefix = value =>
          typeof value === 'string' && value.startsWith('study-') ? value.slice('study-'.length) : null;
        return (
          stripStudyPrefix(definition?.id) ||
          stripStudyPrefix(progress?.definitionId) ||
          null
        );
      })();

      if (resolvedTrackId) {
        allocateDailyStudy({ trackIds: [resolvedTrackId] });
      } else {
        allocateDailyStudy();
      }
    }
    checkDayEnd();

    return { success: true, hours };
  };
}

export function attachProgressHandlers(entries = []) {
  return entries.map(entry => {
    if (!entry?.progress) {
      return entry;
    }
    const handler = createProgressHandler(entry);
    if (handler) {
      entry.onClick = handler;
    }
    return entry;
  });
}

export default {
  applyFocusOrdering,
  attachProgressHandlers,
  collectBuckets,
  createProgressHandler,
  groupEntriesByTaskGroup,
  resolveFocusBucket,
  sortBuckets
};
