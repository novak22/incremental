import { formatHours } from '../../../../core/helpers.js';
import { addLog } from '../../../../core/log.js';
import { getState } from '../../../../core/state.js';
import { endDay } from '../../../../game/lifecycle.js';
import { normalizeActionEntries } from '../../../actions/registry.js';
import {
  DEFAULT_FOCUS_BUCKET,
  getFocusBucketComparator,
  getFocusModeConfig,
  registerFocusBucket
} from '../../../actions/focusBuckets.js';
import { advanceActionInstance, completeActionInstance } from '../../../../game/actions/progress.js';
import { getActionDefinition } from '../../../../game/registryService.js';
import { spendTime } from '../../../../game/time.js';
import todoDom from './todoDom.js';
import todoState from './todoState.js';

let elements = null;
let initialized = false;

function defaultEndDay() {
  endDay(false);
}

function callEndDay() {
  const model = todoState.getLastModel();
  const handler = typeof model?.onEndDay === 'function' ? model.onEndDay : defaultEndDay;
  handler();
}

function handleFocusChange(mode) {
  const changed = todoState.setFocusMode(mode);
  todoDom.syncFocusButtons(elements?.focusButtons || [], todoState.getFocusMode());
  if (changed) {
    const model = todoState.getLastModel();
    if (model) {
      render(model);
    }
  }
}

function init(widgetElements = {}) {
  elements = todoDom.prepareElements(widgetElements);
  todoDom.bindEndDay(elements?.endDayButton, callEndDay);
  todoDom.bindFocusControls(elements?.focusButtons, handleFocusChange, todoState.getFocusMode());
  todoDom.syncFocusButtons(elements?.focusButtons || [], todoState.getFocusMode());
  initialized = true;
}

function formatDuration(hours) {
  const numeric = Number(hours);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return formatHours(0);
  }
  return formatHours(Math.max(0, numeric));
}

function getAvailableHours(model = {}) {
  const available = Number(model?.hoursAvailable);
  if (!Number.isFinite(available)) {
    return Infinity;
  }
  return Math.max(0, available);
}

function getAvailableMoney(model = {}) {
  const available = Number(model?.moneyAvailable);
  if (!Number.isFinite(available)) {
    return Infinity;
  }
  return Math.max(0, available);
}

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
    balanced: { order: ['commitment', 'upgrade', 'hustle'], interleave: ['commitment', 'upgrade', 'hustle'] }
  }
});
registerFocusBucket({ name: 'hustle', comparator: sortHustleEntries });
registerFocusBucket({ name: 'upgrade', comparator: sortUpgradeEntries });

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

function createProgressHandler(entry = {}) {
  const progress = entry?.progress || {};
  const definitionId = progress.definitionId || entry?.definitionId;
  const instanceId = progress.instanceId || entry?.instanceId;
  if (!definitionId || !instanceId) {
    return null;
  }

  return () => {
    const definition = getActionDefinition(definitionId);
    if (!definition) {
      return;
    }

    const metadata = progress.metadata;
    const remaining = Number(progress.hoursRemaining);
    const step = resolveProgressStep(entry);

    const requiresManualCompletion = progress.completion === 'manual';
    const hasRemaining = Number.isFinite(remaining) ? remaining > 0 : true;
    const amount = step > 0 ? step : Math.max(0, remaining);

    if (requiresManualCompletion && (!hasRemaining || amount <= 0)) {
      completeActionInstance(definition, { id: instanceId }, { metadata });
      return;
    }

    const hours = amount > 0 ? amount : step;
    if (!Number.isFinite(hours) || hours <= 0) {
      completeActionInstance(definition, { id: instanceId }, { metadata });
      return;
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
      return;
    }

    spendTime(hours);
    advanceActionInstance(definition, { id: instanceId }, { hours, metadata });
  };
}

function attachProgressHandlers(entries = []) {
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

function getBucketName(entry) {
  if (!entry || typeof entry !== 'object') {
    return DEFAULT_FOCUS_BUCKET;
  }
  const explicitBucket = typeof entry.focusBucket === 'string' ? entry.focusBucket : null;
  if (explicitBucket) {
    return explicitBucket;
  }
  const categoryBucket = typeof entry.focusCategory === 'string' ? entry.focusCategory : null;
  if (categoryBucket) {
    return categoryBucket;
  }
  return DEFAULT_FOCUS_BUCKET;
}

function collectBuckets(entries = []) {
  const buckets = new Map();
  entries.filter(Boolean).forEach(entry => {
    const bucketName = getBucketName(entry);
    if (!buckets.has(bucketName)) {
      buckets.set(bucketName, []);
    }
    buckets.get(bucketName).push(entry);
  });
  return buckets;
}

function sortBuckets(bucketMap = new Map()) {
  const sorted = new Map();
  bucketMap.forEach((bucketEntries, bucketName) => {
    const comparator = getFocusBucketComparator(bucketName);
    sorted.set(bucketName, comparator(bucketEntries));
  });
  return sorted;
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

function applyImmediateTimeDelta(model, hours) {
  if (!model || !Number.isFinite(hours) || hours <= 0) return;
  const available = Math.max(0, Number(model.hoursAvailable) - hours);
  const spent = Math.max(0, Number(model.hoursSpent) + hours);
  model.hoursAvailable = available;
  model.hoursSpent = spent;
  model.hoursAvailableLabel = formatHours(available);
  model.hoursSpentLabel = formatHours(spent);
}

function handleCompletion(entry, model) {
  if (!entry) return false;

  const existing = todoState.getCompletion(entry.id);
  if (existing && !entry.repeatable) {
    return false;
  }

  const previousModel = todoState.getLastModel() || model || {};
  const previousHoursAvailable = Number(previousModel?.hoursAvailable);
  const previousHoursSpent = Number(previousModel?.hoursSpent);

  const previousModelRef = todoState.getLastModel();
  let triggeredUpdate = false;
  if (typeof entry.onClick === 'function') {
    entry.onClick();
    triggeredUpdate = todoState.getLastModel() !== previousModelRef;
  }

  const refreshedModel = triggeredUpdate
    ? (todoState.getLastModel() || {})
    : (model || previousModel || {});
  const duration = Number(entry.durationHours);
  const trackTime = Number.isFinite(duration) && duration > 0;

  let effectiveDuration = null;
  let actionRan = true;
  if (trackTime) {
    const refreshedHoursAvailable = Number(refreshedModel?.hoursAvailable);
    const refreshedHoursSpent = Number(refreshedModel?.hoursSpent);
    const tolerance = 1e-6;
    const spentDelta = Number.isFinite(previousHoursSpent) && Number.isFinite(refreshedHoursSpent)
      ? refreshedHoursSpent - previousHoursSpent
      : null;
    const availableDelta = Number.isFinite(previousHoursAvailable) && Number.isFinite(refreshedHoursAvailable)
      ? previousHoursAvailable - refreshedHoursAvailable
      : null;
    const consumedCandidates = [];
    if (spentDelta !== null && spentDelta > tolerance) {
      consumedCandidates.push(spentDelta);
    }
    if (availableDelta !== null && availableDelta > tolerance) {
      consumedCandidates.push(availableDelta);
    }

    if (consumedCandidates.length) {
      effectiveDuration = Math.max(...consumedCandidates);
      actionRan = true;
    } else if (spentDelta !== null || availableDelta !== null) {
      actionRan = false;
    }
  }

  if (!actionRan) {
    return false;
  }

  const recordedDuration = Number.isFinite(effectiveDuration) ? effectiveDuration : duration;

  todoState.recordCompletion(entry, {
    durationHours: recordedDuration,
    durationText: entry.durationText,
    repeatable: entry.repeatable,
    remainingRuns: entry.remainingRuns
  });

  if (!triggeredUpdate && trackTime) {
    applyImmediateTimeDelta(refreshedModel, recordedDuration);
  }

  render(refreshedModel);
  return true;
}

export function render(model = {}) {
  if (!initialized) {
    init(elements || {});
  }
  if (!elements) {
    elements = {};
  }

  const viewModel = model || {};
  todoState.setLastModel(viewModel);
  todoDom.syncFocusButtons(elements?.focusButtons || [], todoState.getFocusMode());
  todoState.resetCompletedForDay(viewModel.day);
  todoState.seedAutoCompletedEntries(viewModel.autoCompletedEntries, formatDuration);
  todoDom.applyScrollerLimit(elements?.listWrapper, viewModel);

  const entries = attachProgressHandlers(normalizeActionEntries(viewModel));
  const availableHours = getAvailableHours(viewModel);
  const availableMoney = getAvailableMoney(viewModel);
  const pending = entries.filter(entry => {
    const completion = todoState.getCompletion(entry.id);
    const remainingRuns = todoState.getEffectiveRemainingRuns(entry, completion);
    const hasRunsLeft = remainingRuns === null || remainingRuns > 0;
    if (!hasRunsLeft) return false;

    const canAfford = Number.isFinite(availableHours)
      ? entry.durationHours <= availableHours
      : true;
    if (!canAfford) return false;

    const moneyAffordable = Number.isFinite(availableMoney)
      ? entry.moneyCost <= availableMoney
      : true;
    if (!moneyAffordable) return false;

    if (!completion) return true;
    return entry.repeatable;
  });

  const orderedPending = applyFocusOrdering(pending, todoState.getFocusMode());
  todoState.setPendingEntries(orderedPending);

  todoDom.renderHours(elements, viewModel, formatHours);
  todoDom.updateNote(elements?.note, viewModel, orderedPending.length);

  if (!orderedPending.length) {
    todoDom.renderEmptyState(elements?.list, viewModel.emptyMessage, callEndDay);
  } else {
    todoDom.renderPending(elements?.list, orderedPending, viewModel, handleCompletion);
  }

  const completedEntries = todoState.getCompletedEntries();
  todoDom.renderCompleted(elements?.done, elements?.doneHeading, completedEntries, formatDuration);
}

export function hasPendingTasks() {
  return todoState.getPendingEntries().length > 0;
}

export function peekNextTask() {
  const pending = todoState.getPendingEntries();
  return pending.length ? pending[0] : null;
}

export function runNextTask() {
  const next = peekNextTask();
  if (!next) {
    return false;
  }
  return handleCompletion(next, todoState.getLastModel());
}

export default {
  init,
  render,
  hasPendingTasks,
  peekNextTask,
  runNextTask
};
