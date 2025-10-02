import { formatHours } from '../../../../core/helpers.js';
import { endDay } from '../../../../game/lifecycle.js';

const completedItems = new Map();
let elements = null;
let initialized = false;
let currentDay = null;
let lastModel = null;

function bindEndDay(button) {
  if (!button || button.dataset.bound === 'true') return;
  button.addEventListener('click', () => {
    const handler = typeof lastModel?.onEndDay === 'function'
      ? lastModel.onEndDay
      : () => endDay(false);
    handler();
  });
  button.dataset.bound = 'true';
}

function init(widgetElements = {}) {
  if (initialized) return;
  elements = { ...widgetElements };
  if (!elements.listWrapper) {
    const wrapper = elements.container?.querySelector?.('.todo-widget__list-wrapper');
    if (wrapper) {
      elements.listWrapper = wrapper;
    }
  }
  initialized = true;
  bindEndDay(elements?.endDayButton);
  if (elements?.doneHeading) {
    elements.doneHeading.hidden = true;
  }
}

function normalizeDay(day) {
  const numeric = Number(day);
  return Number.isFinite(numeric) ? numeric : null;
}

function resetCompletedForDay(day) {
  const normalized = normalizeDay(day);
  if (normalized === null) {
    if (currentDay !== null) {
      completedItems.clear();
      currentDay = null;
    }
    return;
  }
  if (normalized !== currentDay) {
    completedItems.clear();
    currentDay = normalized;
  }
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

function applyScrollerLimit(model = {}) {
  if (!elements?.listWrapper) return;
  const limit = Number(model?.scroller?.limit);
  if (!Number.isFinite(limit) || limit <= 0) {
    elements.listWrapper.style.removeProperty('--todo-widget-max-height');
    elements.listWrapper.style.removeProperty('--todo-widget-row-height');
    return;
  }
  const rows = Math.max(1, Math.floor(limit));
  const rowHeight = Number(model?.scroller?.rowHeight);
  if (Number.isFinite(rowHeight) && rowHeight > 0) {
    elements.listWrapper.style.setProperty('--todo-widget-row-height', `${rowHeight}rem`);
  } else {
    elements.listWrapper.style.removeProperty('--todo-widget-row-height');
  }
  const maxHeight = `calc(var(--todo-widget-row-height, 4.5rem) * ${rows})`;
  elements.listWrapper.style.setProperty('--todo-widget-max-height', maxHeight);
}

function getEffectiveRemainingRuns(entry = {}, completion) {
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
}

function normalizeEntries(model = {}) {
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
      return {
        id,
        title: entry?.title || 'Action',
        meta,
        onClick: typeof entry?.onClick === 'function' ? entry.onClick : null,
        durationHours: normalizedDuration,
        durationText,
        repeatable,
        remainingRuns
      };
    })
    .filter(entry => Boolean(entry?.id));
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

function renderHours(model = {}) {
  if (elements?.availableValue) {
    const available = Number(model.hoursAvailable);
    const label = model.hoursAvailableLabel
      || formatHours(Number.isFinite(available) ? Math.max(0, available) : 0);
    elements.availableValue.textContent = label || '0h';
  }
  if (elements?.spentValue) {
    const spent = Number(model.hoursSpent);
    const label = model.hoursSpentLabel
      || formatHours(Number.isFinite(spent) ? Math.max(0, spent) : 0);
    elements.spentValue.textContent = label || '0h';
  }
}

function updateNote(model = {}, pendingCount = 0) {
  if (!elements?.note) return;
  if (pendingCount > 0) {
    elements.note.textContent = pendingCount === 1
      ? '1 task ready to trigger.'
      : `${pendingCount} tasks ready to trigger.`;
    return;
  }
  elements.note.textContent = model.emptyMessage || 'Queue a hustle or upgrade to add new tasks.';
}

function renderEmptyState(message) {
  if (!elements?.list) return;
  elements.list.innerHTML = '';
  const empty = document.createElement('li');
  empty.className = 'todo-widget__empty';
  const text = document.createElement('span');
  text.className = 'todo-widget__empty-text';
  text.textContent = message || 'No quick wins queued. Check upgrades or ventures.';
  empty.appendChild(text);

  if (elements?.endDayButton) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'todo-widget__empty-action';
    button.textContent = 'End Day';
    bindEndDay(button);
    empty.appendChild(button);
  }

  elements.list.appendChild(empty);
}

function handleCompletion(entry, model) {
  if (!entry) return false;

  const existing = completedItems.get(entry.id);
  if (existing && !entry.repeatable) {
    return false;
  }

  const previousModel = lastModel || model || {};
  const previousHoursAvailable = Number(previousModel?.hoursAvailable);
  const previousHoursSpent = Number(previousModel?.hoursSpent);

  const previousModelRef = lastModel;
  let triggeredUpdate = false;
  if (typeof entry.onClick === 'function') {
    entry.onClick();
    triggeredUpdate = lastModel !== previousModelRef;
  }

  const refreshedModel = triggeredUpdate ? (lastModel || {}) : (model || previousModel || {});
  const duration = Number(entry.durationHours);
  const trackTime = Number.isFinite(duration) && duration > 0;

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
    const hasSpentDelta = spentDelta !== null;
    const hasAvailableDelta = availableDelta !== null;
    const matchesSpent = hasSpentDelta && spentDelta >= duration - tolerance;
    const matchesAvailable = hasAvailableDelta && availableDelta >= duration - tolerance;
    actionRan = (hasSpentDelta || hasAvailableDelta)
      ? (matchesSpent || matchesAvailable)
      : true;
  }

  if (!actionRan) {
    return false;
  }

  const count = existing ? (existing.count || 1) + 1 : 1;
  completedItems.set(entry.id, {
    id: entry.id,
    title: entry.title,
    durationHours: entry.durationHours,
    durationText: entry.durationText,
    repeatable: entry.repeatable,
    remainingRuns: entry.remainingRuns,
    count,
    completedAt: Date.now()
  });

  if (!triggeredUpdate && trackTime) {
    applyImmediateTimeDelta(refreshedModel, duration);
  }

  render(refreshedModel);
  return true;
}

function createTask(entry, model) {
  const item = document.createElement('li');
  item.className = 'todo-widget__item';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'todo-widget__task';
  button.setAttribute('aria-label', `${entry.title} ${entry.meta}`.trim());

  const checkbox = document.createElement('span');
  checkbox.className = 'todo-widget__checkbox';
  checkbox.textContent = '✓';

  const content = document.createElement('div');
  content.className = 'todo-widget__content';

  const title = document.createElement('span');
  title.className = 'todo-widget__title';
  title.textContent = entry.title;
  content.appendChild(title);

  if (entry.meta) {
    const meta = document.createElement('span');
    meta.className = 'todo-widget__meta';
    meta.textContent = entry.meta;
    content.appendChild(meta);
  }

  button.addEventListener('click', () => {
    if (button.getAttribute('aria-disabled') === 'true') return;
    button.setAttribute('aria-disabled', 'true');
    button.classList.add('is-complete');
    const completed = handleCompletion(entry, model);
    if (!completed) {
      button.removeAttribute('aria-disabled');
      button.classList.remove('is-complete');
    }
  });

  button.append(checkbox, content);
  item.appendChild(button);
  return item;
}

function renderPending(entries, model) {
  if (!elements?.list) return;
  elements.list.innerHTML = '';
  entries.forEach(entry => {
    const task = createTask(entry, model);
    elements.list.appendChild(task);
  });
}

function renderCompleted() {
  if (!elements?.done) return;
  const entries = Array.from(completedItems.values()).sort((a, b) => b.completedAt - a.completedAt);
  elements.done.innerHTML = '';
  if (elements.doneHeading) {
    elements.doneHeading.hidden = entries.length === 0;
  }
  if (!entries.length) {
    const placeholder = document.createElement('li');
    placeholder.className = 'todo-widget__empty';
    placeholder.textContent = 'Nothing checked off yet.';
    elements.done.appendChild(placeholder);
    return;
  }

  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'todo-widget__done-item';

    const title = document.createElement('span');
    title.className = 'todo-widget__done-title';
    title.textContent = entry.title;

    const meta = document.createElement('span');
    meta.className = 'todo-widget__done-meta';
    const label = entry.durationText || formatDuration(entry.durationHours);
    const countLabel = entry.count && entry.count > 1 ? ` ×${entry.count}` : '';
    meta.textContent = `(${label}${countLabel})`;

    item.append(title, meta);
    elements.done.appendChild(item);
  });
}

export function render(model = {}) {
  if (!initialized) {
    init(elements || {});
  }
  if (!elements) {
    elements = {};
  }

  lastModel = model || {};
  resetCompletedForDay(model.day);
  applyScrollerLimit(model);

  const entries = normalizeEntries(model);
  const availableHours = getAvailableHours(model);
  const pending = entries.filter(entry => {
    const completion = completedItems.get(entry.id);
    const remainingRuns = getEffectiveRemainingRuns(entry, completion);
    const hasRunsLeft = remainingRuns === null || remainingRuns > 0;
    if (!hasRunsLeft) return false;

    const canAfford = Number.isFinite(availableHours)
      ? entry.durationHours <= availableHours
      : true;
    if (!canAfford) return false;

    if (!completion) return true;
    return entry.repeatable;
  });

  renderHours(model);
  updateNote(model, pending.length);

  if (!pending.length) {
    renderEmptyState(model.emptyMessage);
  } else {
    renderPending(pending, model);
  }

  renderCompleted();
}

export default {
  init,
  render
};
