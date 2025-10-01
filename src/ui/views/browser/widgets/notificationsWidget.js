let elements = null;
let initialized = false;

function init(widgetElements = {}) {
  if (initialized) return;
  elements = widgetElements;
  initialized = true;
}

function createNotification(entry, resolveAction) {
  const item = document.createElement('li');
  item.className = 'browser-notification';

  const title = document.createElement('p');
  title.className = 'browser-notification__title';
  title.textContent = entry?.label || 'Notification';

  const message = document.createElement('p');
  message.className = 'browser-notification__message';
  message.textContent = entry?.message || '';

  item.append(title);
  if (entry?.message) {
    item.append(message);
  }

  const action = resolveAction ? resolveAction(entry) : null;
  if (action || entry?.action?.label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'browser-notification__action';
    button.textContent = entry?.action?.label || 'Open';
    if (!action) {
      button.disabled = true;
    } else {
      button.addEventListener('click', action);
    }
    item.append(button);
  }

  return item;
}

export function render(model = {}, options = {}) {
  if (!initialized) {
    init(elements || {});
  }

  if (!elements?.list) return;

  const entries = Array.isArray(model.entries) ? model.entries.filter(Boolean) : [];
  const resolveAction = typeof options?.resolveAction === 'function' ? options.resolveAction : null;

  elements.list.innerHTML = '';

  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'browser-todo-empty';
    empty.textContent = model.emptyMessage || 'All clear. Nothing urgent right now.';
    elements.list.appendChild(empty);
  } else {
    entries.slice(0, 6).forEach(entry => {
      elements.list.appendChild(createNotification(entry, resolveAction));
    });
  }

  if (elements.note) {
    elements.note.textContent = entries.length
      ? 'Shortlist of upgrades, upkeep, and event pings.'
      : model.emptyMessage || 'All clear. Nothing urgent right now.';
  }
}

export default {
  init,
  render
};
