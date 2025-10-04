import { ensureArray } from '../../../../../../../core/helpers.js';

function createActionButton(action, label, instanceId, helpers) {
  const { onQuickAction, formatCurrency, formatHours } = helpers;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'serverhub-action-console__button';

  const actionLabel = document.createElement('span');
  actionLabel.className = 'serverhub-action-console__label';
  actionLabel.textContent = action.label || label;

  const meta = document.createElement('span');
  meta.className = 'serverhub-action-console__meta';
  const timeLabel = Number(action.time) > 0 ? formatHours(action.time) : 'Instant';
  const costLabel = formatCurrency(action.cost || 0);
  meta.textContent = `${timeLabel} • ${costLabel}`;

  if (!action.available) {
    button.disabled = true;
    if (action.disabledReason) {
      button.title = action.disabledReason;
    }
  }

  button.append(actionLabel, meta);
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (button.disabled) return;
    onQuickAction(instanceId, action.id);
  });

  return button;
}

export default function renderActionConsole(instance, helpers) {
  const section = document.createElement('section');
  section.className = 'serverhub-panel serverhub-panel--actions';

  const heading = document.createElement('h3');
  heading.textContent = 'Action console';
  section.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'serverhub-action-console';

  const actions = ensureArray(instance.actions);
  let rendered = 0;

  ensureArray(helpers.actionConsoleOrder).forEach(({ id, label }) => {
    const action = instance.actionsById?.[id] || actions.find(entry => entry.id === id);
    if (!action) return;
    list.appendChild(createActionButton(action, label, instance.id, helpers));
    rendered += 1;
  });

  if (!rendered) {
    const empty = document.createElement('p');
    empty.className = 'serverhub-panel__hint';
    empty.textContent = 'Quality actions unlock as your SaaS portfolio grows.';
    section.appendChild(empty);
  } else {
    section.appendChild(list);
  }

  return section;
}
