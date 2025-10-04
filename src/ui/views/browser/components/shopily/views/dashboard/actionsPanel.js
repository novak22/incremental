import { ensureArray } from '../../../../../../../core/helpers.js';

export default function createActionSection(instance, helpers = {}) {
  const {
    formatHours = value => String(value ?? ''),
    formatCurrency = value => String(value ?? ''),
    onRunAction = () => {}
  } = helpers;
  const fragment = document.createDocumentFragment();
  const actions = ensureArray(instance.actions);
  if (!actions.length) {
    const empty = document.createElement('p');
    empty.className = 'shopily-panel__note';
    empty.textContent = 'No actions unlocked yet. Install upgrades to expand your playbook.';
    fragment.appendChild(empty);
    return fragment;
  }
  const list = document.createElement('ul');
  list.className = 'shopily-action-list';
  actions.forEach(action => {
    const item = document.createElement('li');
    item.className = 'shopily-action';
    const label = document.createElement('div');
    label.className = 'shopily-action__label';
    label.textContent = action.label;
    const meta = document.createElement('div');
    meta.className = 'shopily-action__meta';
    const time = action.time > 0 ? formatHours(action.time) : 'Instant';
    const cost = action.cost > 0 ? formatCurrency(action.cost) : 'No spend';
    meta.textContent = `${time} • ${cost}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shopily-button shopily-button--secondary';
    button.textContent = action.available ? 'Run now' : 'Locked';
    button.disabled = !action.available;
    if (action.disabledReason) {
      button.title = action.disabledReason;
    }
    button.addEventListener('click', () => {
      if (button.disabled) return;
      onRunAction(instance.id, action.id);
    });
    item.append(label, meta, button);
    list.appendChild(item);
  });
  fragment.appendChild(list);
  return fragment;
}
