import { formatHours } from '../../../../core/helpers.js';
import { endDay } from '../../../../game/lifecycle.js';
import { normalizeActionEntries } from '../../../actions/registry.js';
import {
  applyFocusOrdering,
  attachProgressHandlers,
  createProgressHandler,
  DEFAULT_TODO_EMPTY_MESSAGE
} from '../../../actions/taskGrouping.js';
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
  let runOutcome;
  if (typeof entry.onClick === 'function') {
    runOutcome = entry.onClick();
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

  if (runOutcome && typeof runOutcome === 'object') {
    if (runOutcome.success === false) {
      return false;
    }
    if (runOutcome.success === true) {
      actionRan = true;
      if (Number.isFinite(runOutcome.hours)) {
        if (Number.isFinite(effectiveDuration)) {
          effectiveDuration = Math.max(effectiveDuration, runOutcome.hours);
        } else {
          effectiveDuration = runOutcome.hours;
        }
      }
    }
  } else if (runOutcome === false) {
    return false;
  } else if (runOutcome === true) {
    actionRan = true;
  }

  if (!actionRan) {
    return false;
  }

  const outcomeHours = runOutcome && typeof runOutcome === 'object' ? Number(runOutcome.hours) : NaN;
  const recordedDuration = Number.isFinite(effectiveDuration)
    ? effectiveDuration
    : Number.isFinite(outcomeHours)
      ? outcomeHours
      : Number.isFinite(duration)
        ? duration
        : 0;

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
  const emptyMessage = viewModel.emptyMessage || DEFAULT_TODO_EMPTY_MESSAGE;
  todoDom.updateNote(elements?.note, { ...viewModel, emptyMessage }, orderedPending.length);

  if (!orderedPending.length) {
    todoDom.renderEmptyState(elements?.list, emptyMessage, callEndDay);
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

export const __testables = {
  createProgressHandler
};
