const completedItems = new Map();
let elements = null;
let initialized = false;

function init(widgetElements = {}) {
  if (initialized) return;
  elements = widgetElements;
  initialized = true;
  if (elements?.doneHeading) {
    elements.doneHeading.hidden = true;
  }
}

function normalizeEntries(model = {}) {
  const entries = Array.isArray(model.entries) ? model.entries : [];
  return entries
    .map((entry, index) => ({
      id: entry?.id ?? `todo-${index}`,
      title: entry?.title || 'Action',
      subtitle: entry?.subtitle || '',
      onClick: typeof entry?.onClick === 'function' ? entry.onClick : null
    }))
    .filter(Boolean);
}

function syncCompleted(entries) {
  const allowed = new Set(entries.map(entry => entry.id));
  Array.from(completedItems.keys()).forEach(key => {
    if (!allowed.has(key)) {
      completedItems.delete(key);
    }
  });
}

function renderEmptyState(message) {
  if (!elements?.list) return;
  elements.list.innerHTML = '';
  const empty = document.createElement('li');
  empty.className = 'browser-todo-empty';
  empty.textContent = message || 'No quick wins queued. Check upgrades or ventures.';
  elements.list.appendChild(empty);
}

function renderPending(entries, source) {
  if (!elements?.list) return;
  elements.list.innerHTML = '';

  entries.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'browser-todo-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'browser-todo-checkbox';
    checkbox.setAttribute('aria-label', entry.title);

    const content = document.createElement('div');
    content.className = 'browser-todo-content';

    const label = document.createElement('span');
    label.className = 'browser-todo-label';
    label.textContent = entry.title;

    content.appendChild(label);

    if (entry.subtitle) {
      const note = document.createElement('p');
      note.className = 'browser-todo-note';
      note.textContent = entry.subtitle;
      content.appendChild(note);
    }

    checkbox.addEventListener('change', () => {
      if (!checkbox.checked) return;
      item.classList.add('is-completing');
      window.setTimeout(() => {
        completedItems.set(entry.id, {
          id: entry.id,
          title: entry.title,
          subtitle: entry.subtitle,
          completedAt: Date.now()
        });
        if (typeof entry.onClick === 'function') {
          entry.onClick();
        }
        render(source);
      }, 240);
    });

    item.append(checkbox, content);
    elements.list.appendChild(item);
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
    placeholder.className = 'browser-todo-empty';
    placeholder.textContent = 'Nothing checked off yet.';
    elements.done.appendChild(placeholder);
    return;
  }

  entries.forEach(entry => {
    const item = document.createElement('li');
    item.textContent = entry.title;
    if (entry.subtitle) {
      item.title = entry.subtitle;
    }
    elements.done.appendChild(item);
  });
}

export function render(model = {}) {
  if (!initialized) {
    init(elements || {});
  }

  const entries = normalizeEntries(model);
  syncCompleted(entries);

  const pending = entries.filter(entry => !completedItems.has(entry.id));

  if (elements?.note) {
    const count = pending.length;
    elements.note.textContent = count
      ? `${count} actionable step${count === 1 ? '' : 's'} ready.`
      : model.emptyMessage || 'Queue a hustle or upgrade to add new tasks.';
  }

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
