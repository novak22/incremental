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
  elements = widgetElements;
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
      return {
        id,
        title: entry?.title || 'Action',
        meta,
        onClick: typeof entry?.onClick === 'function' ? entry.onClick : null,
        durationHours: normalizedDuration,
        durationText
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
  empty.textContent = message || 'No quick wins queued. Check upgrades or ventures.';
  elements.list.appendChild(empty);
}

function handleCompletion(entry, model) {
  if (!entry || completedItems.has(entry.id)) return;
  completedItems.set(entry.id, {
    id: entry.id,
    title: entry.title,
    durationHours: entry.durationHours,
    durationText: entry.durationText,
    completedAt: Date.now()
  });
  if (typeof entry.onClick === 'function') {
    entry.onClick();
  }
  applyImmediateTimeDelta(model, entry.durationHours);
  render(model);
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
    handleCompletion(entry, model);
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
    meta.textContent = `(${label})`;

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

  const entries = normalizeEntries(model);
  const pending = entries.filter(entry => !completedItems.has(entry.id));

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
