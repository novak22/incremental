export function renderActionsPanel(video, { formatCurrency, formatHours, onQuickAction } = {}) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';

  const title = document.createElement('h3');
  title.textContent = 'Quality actions';
  panel.appendChild(title);

  if (!Array.isArray(video.actions) || !video.actions.length) {
    const empty = document.createElement('p');
    empty.className = 'videotube-panel__note';
    empty.textContent = 'No actions unlocked yet. Discover upgrades to expand your toolkit.';
    panel.appendChild(empty);
    return panel;
  }

  const list = document.createElement('ul');
  list.className = 'videotube-action-list';

  video.actions.forEach(action => {
    const item = document.createElement('li');
    item.className = 'videotube-action';

    const label = document.createElement('div');
    label.className = 'videotube-action__label';
    label.textContent = action.label;

    const meta = document.createElement('div');
    meta.className = 'videotube-action__meta';
    const costParts = [
      action.time > 0 ? `${formatHours?.(action.time)}` : 'Instant',
      action.cost > 0 ? formatCurrency?.(action.cost) : 'Free'
    ];
    meta.textContent = `${action.effect} • ${costParts.join(' • ')}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'videotube-button videotube-button--primary';
    button.textContent = 'Run action';
    button.disabled = !action.available;
    button.title = action.available ? '' : action.disabledReason || 'Unavailable';
    button.addEventListener('click', () => {
      if (button.disabled) return;
      onQuickAction?.(video.id, action.id);
    });

    item.append(label, meta, button);
    list.appendChild(item);
  });

  panel.appendChild(list);
  return panel;
}

export default renderActionsPanel;
