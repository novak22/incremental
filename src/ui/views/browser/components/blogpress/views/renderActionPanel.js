export default function renderActionPanel({ instance, handlers = {}, formatHours, formatCurrency }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--actions';
  const title = document.createElement('h3');
  title.textContent = 'Upgrade actions';
  panel.appendChild(title);

  if (!instance.actions.length) {
    const note = document.createElement('p');
    note.className = 'blogpress-panel__hint';
    note.textContent = 'No quality actions unlocked yet. Progress through story beats to reveal them.';
    panel.appendChild(note);
    return panel;
  }

  const list = document.createElement('ul');
  list.className = 'blogpress-action-list';

  instance.actions.forEach(action => {
    const item = document.createElement('li');
    item.className = 'blogpress-action';
    const label = document.createElement('div');
    label.className = 'blogpress-action__label';
    label.textContent = action.label;
    const meta = document.createElement('span');
    meta.className = 'blogpress-action__meta';
    const parts = [];
    if (action.time > 0) parts.push(formatHours(action.time));
    if (action.cost > 0) parts.push(formatCurrency(action.cost));
    meta.textContent = parts.length ? parts.join(' • ') : 'Instant';
    label.appendChild(meta);
    item.appendChild(label);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'blogpress-button blogpress-button--primary';
    button.textContent = action.available ? 'Run' : 'Locked';
    button.disabled = !action.available;
    if (action.disabledReason) {
      button.title = action.disabledReason;
    }
    button.addEventListener('click', () => {
      if (button.disabled) return;
      if (handlers.onRunAction) handlers.onRunAction(instance.id, action.id);
    });
    item.appendChild(button);

    list.appendChild(item);
  });

  panel.appendChild(list);
  return panel;
}
