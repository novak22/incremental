export default function renderActionPanel({ instance, handlers = {}, formatHours, formatCurrency }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--actions';
  const title = document.createElement('h3');
  title.textContent = 'Actions';
  panel.appendChild(title);

  const actions = Array.isArray(instance.actions) ? instance.actions.slice() : [];
  if (actions.length) {
    actions.sort((a, b) => Number(b.available) - Number(a.available));
  }

  const nextAction = actions.find(action => action.available);

  if (!actions.length) {
    const note = document.createElement('p');
    note.className = 'blogpress-panel__hint';
    note.textContent = 'No quality actions unlocked yet. Progress through story beats to reveal them.';
    panel.appendChild(note);
  } else {
    const list = document.createElement('ul');
    list.className = 'blogpress-action-list';

    actions.forEach(action => {
      const item = document.createElement('li');
      item.className = 'blogpress-action';
      if (nextAction && action.id === nextAction.id) {
        item.classList.add('blogpress-action--next');
      } else if (!action.available) {
        item.classList.add('blogpress-action--idle');
      }
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
      button.textContent = action.available ? 'Run' : 'Resting';
      button.disabled = !action.available;
      if (!action.available) {
        button.classList.add('is-idle');
      }
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
  }

  const footer = document.createElement('footer');
  footer.className = 'blogpress-action-footer';

  const sellBlock = document.createElement('div');
  sellBlock.className = 'blogpress-action-footer__retire';

  const retireLabel = document.createElement('p');
  retireLabel.className = 'blogpress-action-footer__label';
  retireLabel.textContent = 'Retire blog';
  sellBlock.appendChild(retireLabel);

  const retireHint = document.createElement('p');
  retireHint.className = 'blogpress-panel__hint';
  retireHint.textContent = 'Cash out when you need momentum for a new build.';
  sellBlock.appendChild(retireHint);

  const salePrice = Math.max(0, Number(instance.salePrice) || 0);
  const sellButton = document.createElement('button');
  sellButton.type = 'button';
  sellButton.className = 'blogpress-button blogpress-button--danger';
  sellButton.textContent = salePrice > 0
    ? `Sell (+${formatCurrency(salePrice)})`
    : 'Sell (no payout)';
  sellButton.addEventListener('click', () => {
    if (handlers.onSell) handlers.onSell(instance);
  });

  sellBlock.appendChild(sellButton);
  footer.appendChild(sellBlock);
  panel.appendChild(footer);
  return panel;
}
