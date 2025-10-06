import { formatHours } from '../../core/helpers.js';
import { addLog } from '../../core/log.js';
import { getState } from '../../core/state.js';
import { advanceActionInstance, completeActionInstance } from '../../game/actions/progress/instances.js';
import { getActionDefinition } from '../../game/registryService.js';
import { spendTime } from '../../game/time.js';
import { allocateDailyStudy } from '../../game/requirements.js';
import { checkDayEnd } from '../../game/lifecycle.js';
import { registerFocusBucket } from './focusBuckets.js';
import {
  applyFocusOrdering as applyFocusOrderingBase,
  collectBuckets as collectBucketsBase,
  groupEntriesByTaskGroup as groupEntriesByTaskGroupBase,
  rankEntriesByRoi,
  resolveFocusBucket as resolveFocusBucketBase,
  sortBuckets as sortBucketsBase
} from './queueService.js';
import { resolveStudyTrackId } from './studyTracks.js';

export const DEFAULT_TODO_EMPTY_MESSAGE = 'Queue an action or upgrade to add new tasks.';

export const TASK_GROUP_CONFIGS = [
  {
    key: 'hustle',
    label: 'Contracts queued',
    empty: 'Accept a contract to stack this lane.',
    buckets: ['hustle', 'contract', 'project', 'gig', 'work']
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
    empty: 'Enroll in a course to keep your skills leveling.',
    buckets: ['study', 'education', 'course', 'training', 'lesson', 'class']
  },
  {
    key: 'other',
    label: 'Upkeep & support',
    empty: 'No upkeep tasks waiting on you.',
    buckets: ['other', 'commitment', 'assist', 'support', 'maintenance', 'upkeep', 'care', 'service']
  }
];

function sortHustleEntries(entries = []) {
  return rankEntriesByRoi(entries);
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

export const resolveFocusBucket = resolveFocusBucketBase;

export const collectBuckets = collectBucketsBase;

export const sortBuckets = sortBucketsBase;

export function applyFocusOrdering(entries = [], mode = 'balanced') {
  return applyFocusOrderingBase(entries, mode);
}

export function groupEntriesByTaskGroup(entries = [], options = {}) {
  const groupConfigs = Array.isArray(options?.groupConfigs) && options.groupConfigs.length
    ? options.groupConfigs
    : TASK_GROUP_CONFIGS;
  return groupEntriesByTaskGroupBase(entries, {
    ...options,
    groupConfigs
  });
}

function normalizeAvailability(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return Infinity;
  }
  return Math.max(0, numeric);
}

export function buildTodoGrouping(entries = [], options = {}) {
  const focusMode = typeof options?.focusMode === 'string' && options.focusMode.trim()
    ? options.focusMode
    : 'balanced';

  const availableHours = normalizeAvailability(options?.availableHours);
  const availableMoney = normalizeAvailability(options?.availableMoney);

  const resolveCompletion = typeof options?.getCompletion === 'function'
    ? options.getCompletion
    : () => null;

  const resolveRemainingRuns = typeof options?.getRemainingRuns === 'function'
    ? options.getRemainingRuns
    : (entry, completion) => {
      if (entry?.remainingRuns == null) {
        return null;
      }
      const total = Number(entry.remainingRuns);
      if (!Number.isFinite(total)) {
        return null;
      }
      const used = Number(completion?.count);
      const consumed = Number.isFinite(used) ? Math.max(0, used) : 0;
      return Math.max(0, total - consumed);
    };

  const preparedEntries = attachProgressHandlers(
    Array.isArray(entries)
      ? entries
          .filter(Boolean)
          .map(entry => ({ ...entry }))
      : []
  );

  const pending = preparedEntries.filter(entry => {
    if (!entry) {
      return false;
    }

    const completion = resolveCompletion(entry) || null;
    const remainingRuns = resolveRemainingRuns(entry, completion);
    const hasRunsLeft = remainingRuns == null || remainingRuns > 0;
    if (!hasRunsLeft) {
      return false;
    }

    const requiredHours = Number(entry.durationHours);
    if (Number.isFinite(availableHours) && availableHours !== Infinity && Number.isFinite(requiredHours)) {
      if (requiredHours > availableHours) {
        return false;
      }
    }

    const cost = Number(entry.moneyCost);
    if (Number.isFinite(availableMoney) && availableMoney !== Infinity && Number.isFinite(cost)) {
      if (cost > availableMoney) {
        return false;
      }
    }

    if (!completion) {
      return true;
    }

    return Boolean(entry.repeatable);
  });

  const ordered = applyFocusOrdering(pending, focusMode);
  const groups = groupEntriesByTaskGroup(ordered, options);
  const emptyMessage = options?.emptyMessage || DEFAULT_TODO_EMPTY_MESSAGE;

  return {
    entries: ordered,
    groups,
    totalPending: ordered.length,
    emptyMessage
  };
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
      const resolvedTrackId = resolveStudyTrackId(progress, definition, entry);

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
  buildTodoGrouping,
  collectBuckets,
  createProgressHandler,
  groupEntriesByTaskGroup,
  resolveFocusBucket,
  sortBuckets
};
