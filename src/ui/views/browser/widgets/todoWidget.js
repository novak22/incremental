import { formatHours } from '../../../../core/helpers.js';
import { endDay } from '../../../../game/lifecycle.js';
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

export function normalizeEntries(model = {}) {
  const entries = Array.isArray(model.entries) ? model.entries : [];
  return entries
    .map((entry, index) => {
      const id = entry?.id ?? `todo-${index}`;
      const durationHours = Number(entry?.durationHours ?? entry?.timeCost);
      const normalizedDuration = Number.isFinite(durationHours) ? Math.max(0, durationHours) : 0;
      const durationText = entry?.durationText || formatDuration(normalizedDuration);
      const payoutText = entry?.payoutText || entry?.payoutLabel || '';
      const meta = entry?.meta || [payoutText, durationText].filter(Boolean).join(' • ');
      const rawRemaining = Number(entry?.remainingRuns);
      const hasRemaining = Number.isFinite(rawRemaining);
      const remainingRuns = hasRemaining ? Math.max(0, rawRemaining) : null;
      const repeatable = Boolean(entry?.repeatable) || (hasRemaining && remainingRuns > 1);
      const moneyCost = Number(entry?.moneyCost);
      const normalizedMoney = Number.isFinite(moneyCost) ? Math.max(0, moneyCost) : 0;
      const rawPayout = Number(entry?.payout);
      const normalizedPayout = Number.isFinite(rawPayout) ? Math.max(0, rawPayout) : 0;
      const moneyPerHour = normalizedDuration > 0
        ? normalizedPayout / normalizedDuration
        : normalizedPayout;
      const focusCategory = entry?.focusCategory || entry?.category || entry?.type || null;
      const rawUpgradeRemaining = Number(entry?.upgradeRemaining ?? entry?.remaining ?? entry?.requirementsRemaining);
      const upgradeRemaining = Number.isFinite(rawUpgradeRemaining) ? Math.max(0, rawUpgradeRemaining) : null;
      const orderIndex = Number.isFinite(entry?.orderIndex) ? entry.orderIndex : index;
      return {
        id,
        title: entry?.title || 'Action',
        meta,
        onClick: typeof entry?.onClick === 'function' ? entry.onClick : null,
        durationHours: normalizedDuration,
        durationText,
        moneyCost: normalizedMoney,
        repeatable,
        remainingRuns,
        payout: normalizedPayout,
        moneyPerHour: Number.isFinite(moneyPerHour) ? moneyPerHour : 0,
        focusCategory,
        upgradeRemaining,
        orderIndex
      };
    })
    .filter(entry => Boolean(entry?.id));
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

function applyFocusOrdering(entries = [], mode = 'balanced') {
  if (!Array.isArray(entries) || entries.length === 0) {
    return entries;
  }

  const hustles = entries.filter(entry => entry?.focusCategory === 'hustle');
  const upgrades = entries.filter(entry => entry?.focusCategory === 'upgrade');
  const others = entries.filter(entry => entry?.focusCategory !== 'hustle' && entry?.focusCategory !== 'upgrade');
  const sortedHustles = sortHustleEntries(hustles);
  const sortedUpgrades = sortUpgradeEntries(upgrades);

  switch (mode) {
    case 'money': {
      return [...sortedHustles, ...sortedUpgrades, ...others.filter(Boolean)];
    }
    case 'upgrades': {
      return [...sortedUpgrades, ...sortedHustles, ...others.filter(Boolean)];
    }
    case 'balanced':
    default: {
      const interleaved = interleaveEntries(sortedUpgrades, sortedHustles);
      const usedIds = new Set(interleaved.map(entry => entry.id));
      const leftovers = [...sortedUpgrades, ...sortedHustles, ...others.filter(Boolean)]
        .filter(entry => !usedIds.has(entry.id));
      return [...interleaved, ...leftovers];
    }
  }
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

  const entries = normalizeEntries(viewModel);
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
