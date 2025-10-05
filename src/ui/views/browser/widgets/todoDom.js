import { DEFAULT_TODO_EMPTY_MESSAGE } from '../../../actions/taskGrouping.js';

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value) {
    return [];
  }
  if (typeof value.forEach === 'function' && typeof value.length === 'number') {
    return Array.from(value);
  }
  return [];
}

function prepareElements(widgetElements = {}) {
  const elements = { ...widgetElements };

  if (!elements.listWrapper && elements.container?.querySelector) {
    const wrapper = elements.container.querySelector('.todo-widget__list-wrapper');
    if (wrapper) {
      elements.listWrapper = wrapper;
    }
  }

  if (elements.focusButtons) {
    elements.focusButtons = toArray(elements.focusButtons);
  } else if (elements.focusGroup?.querySelectorAll) {
    const buttons = elements.focusGroup.querySelectorAll('[data-focus]');
    if (buttons?.length) {
      elements.focusButtons = Array.from(buttons);
    }
  } else {
    elements.focusButtons = [];
  }

  if (elements.doneHeading) {
    elements.doneHeading.hidden = true;
  }

  return elements;
}

function bindEndDay(button, handler) {
  if (!button || button.dataset.bound === 'true') return;
  if (typeof handler !== 'function') return;

  button.addEventListener('click', handler);
  button.dataset.bound = 'true';
}

function syncFocusButtons(buttons = [], activeMode) {
  buttons.forEach(button => {
    if (!button?.dataset) return;
    const mode = button.dataset.focus;
    const isActive = mode === activeMode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function bindFocusControls(buttons = [], onFocusChange, activeMode) {
  if (!Array.isArray(buttons) || !buttons.length) {
    return;
  }

  buttons.forEach(button => {
    if (!button || button.dataset.focusBound === 'true') return;
    button.addEventListener('click', () => {
      const mode = button.dataset.focus;
      if (typeof onFocusChange === 'function') {
        onFocusChange(mode);
      }
    });
    button.dataset.focusBound = 'true';
  });

  syncFocusButtons(buttons, activeMode);
}

function applyScrollerLimit(listWrapper, model = {}) {
  if (!listWrapper?.style) return;

  const limit = Number(model?.scroller?.limit);
  if (!Number.isFinite(limit) || limit <= 0) {
    listWrapper.style.removeProperty('--todo-widget-max-height');
    listWrapper.style.removeProperty('--todo-widget-row-height');
    return;
  }

  const rows = Math.max(1, Math.floor(limit));
  const rowHeight = Number(model?.scroller?.rowHeight);
  if (Number.isFinite(rowHeight) && rowHeight > 0) {
    listWrapper.style.setProperty('--todo-widget-row-height', `${rowHeight}rem`);
  } else {
    listWrapper.style.removeProperty('--todo-widget-row-height');
  }
  const maxHeight = `calc(var(--todo-widget-row-height, 4.5rem) * ${rows})`;
  listWrapper.style.setProperty('--todo-widget-max-height', maxHeight);
}

function renderHours(elements = {}, model = {}, formatHours) {
  if (typeof formatHours !== 'function') return;

  if (elements.availableValue) {
    const available = Number(model.hoursAvailable);
    const label = model.hoursAvailableLabel
      || formatHours(Number.isFinite(available) ? Math.max(0, available) : 0);
    elements.availableValue.textContent = label || '0h';
  }

  if (elements.spentValue) {
    const spent = Number(model.hoursSpent);
    const label = model.hoursSpentLabel
      || formatHours(Number.isFinite(spent) ? Math.max(0, spent) : 0);
    elements.spentValue.textContent = label || '0h';
  }
}

function updateNote(note, model = {}, pendingCount = 0) {
  if (!note) return;

  if (pendingCount > 0) {
    note.textContent = pendingCount === 1
      ? '1 task ready to trigger.'
      : `${pendingCount} tasks ready to trigger.`;
    return;
  }

  note.textContent = model.emptyMessage || DEFAULT_TODO_EMPTY_MESSAGE;
}

function createTask(entry, model, onComplete) {
  const item = document.createElement('li');
  item.className = 'todo-widget__item';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'todo-widget__task';
  button.setAttribute('aria-label', `${entry.title} ${entry.meta}`.trim());

  const disabled = Boolean(entry?.disabled);
  if (disabled) {
    button.setAttribute('aria-disabled', 'true');
    button.classList.add('is-disabled');
    if (entry?.disabledReason) {
      button.title = entry.disabledReason;
    }
  }

  const checkbox = document.createElement('span');
  checkbox.className = 'todo-widget__checkbox';
  checkbox.textContent = '✓';

  const content = document.createElement('div');
  content.className = 'todo-widget__content';

  const title = document.createElement('span');
  title.className = 'todo-widget__title';
  title.textContent = entry.title;
  content.appendChild(title);

  if (entry.subtitle) {
    const subtitle = document.createElement('span');
    subtitle.className = 'todo-widget__subtitle';
    subtitle.textContent = entry.subtitle;
    content.appendChild(subtitle);
  }

  if (entry.meta) {
    const meta = document.createElement('span');
    const metaClass = typeof entry.metaClass === 'string' && entry.metaClass.trim()
      ? `todo-widget__meta ${entry.metaClass}`
      : 'todo-widget__meta';
    meta.className = metaClass;
    meta.textContent = entry.meta;
    content.appendChild(meta);
  }

  button.addEventListener('click', () => {
    if (disabled) {
      return;
    }
    if (button.getAttribute('aria-disabled') === 'true') return;
    button.setAttribute('aria-disabled', 'true');
    button.classList.add('is-complete');

    const completed = typeof onComplete === 'function' ? onComplete(entry, model) : false;
    if (!completed) {
      button.removeAttribute('aria-disabled');
      button.classList.remove('is-complete');
    }
  });

  button.append(checkbox, content);
  item.appendChild(button);
  return item;
}

function renderPending(list, entries = [], model, onComplete) {
  if (!list) return;

  list.innerHTML = '';
  entries.forEach(entry => {
    const task = createTask(entry, model, onComplete);
    list.appendChild(task);
  });
}

function renderEmptyState(list, message, onEndDay) {
  if (!list) return;

  list.innerHTML = '';
  const empty = document.createElement('li');
  empty.className = 'todo-widget__empty';

  const text = document.createElement('span');
  text.className = 'todo-widget__empty-text';
  text.textContent = message || 'No quick wins queued. Check upgrades or ventures.';
  empty.appendChild(text);

  if (typeof onEndDay === 'function') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'todo-widget__empty-action';
    button.textContent = 'End Day';
    bindEndDay(button, onEndDay);
    empty.appendChild(button);
  }

  list.appendChild(empty);
}

function renderCompleted(list, heading, entries = [], formatDuration) {
  if (!list) return;

  const sorted = [...entries].sort((a, b) => b.completedAt - a.completedAt);
  list.innerHTML = '';

  if (heading) {
    heading.hidden = sorted.length === 0;
  }

  if (!sorted.length) {
    const placeholder = document.createElement('li');
    placeholder.className = 'todo-widget__empty';
    placeholder.textContent = 'Nothing checked off yet.';
    list.appendChild(placeholder);
    return;
  }

  sorted.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'todo-widget__done-item';

    const title = document.createElement('span');
    title.className = 'todo-widget__done-title';
    title.textContent = entry.title;

    const meta = document.createElement('span');
    meta.className = 'todo-widget__done-meta';
    const label = entry.durationText
      || (typeof formatDuration === 'function' ? formatDuration(entry.durationHours) : '0h');
    const countLabel = entry.count && entry.count > 1 ? ` ×${entry.count}` : '';
    meta.textContent = `(${label}${countLabel})`;

    item.append(title, meta);
    list.appendChild(item);
  });
}

export {
  applyScrollerLimit,
  bindEndDay,
  bindFocusControls,
  prepareElements,
  renderCompleted,
  renderEmptyState,
  renderHours,
  renderPending,
  syncFocusButtons,
  updateNote
};

export default {
  applyScrollerLimit,
  bindEndDay,
  bindFocusControls,
  prepareElements,
  renderCompleted,
  renderEmptyState,
  renderHours,
  renderPending,
  syncFocusButtons,
  updateNote
};
