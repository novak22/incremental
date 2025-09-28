import { formatMoney } from '../core/helpers.js';
import { getAssetState } from '../core/state.js';
import { calculateAssetSalePrice, instanceLabel, sellAssetInstance } from '../game/assets/helpers.js';

export function describeInstance(definition, instance) {
  if (instance.status === 'setup') {
    const remaining = Number(instance.daysRemaining) || 0;
    if (remaining > 0) {
      return `Setup • ${remaining} day${remaining === 1 ? '' : 's'} to launch`;
    }
    return 'Setup • Launching soon';
  }
  const level = Number(instance.quality?.level) || 0;
  return `Active • Quality ${level}`;
}

export function describeInstanceEarnings(instance) {
  if (instance.status !== 'active') {
    return '💤 No earnings until launch';
  }
  const lastIncome = Math.max(0, Number(instance.lastIncome) || 0);
  if (lastIncome > 0) {
    return `💰 $${formatMoney(lastIncome)} yesterday`;
  }
  return '💤 No payout yesterday';
}

function renderInstanceList(definition, state, ui) {
  const container = ui?.extra?.instanceList;
  if (!container) return;
  const assetState = getAssetState(definition.id, state);
  const instances = assetState?.instances || [];

  container.innerHTML = '';

  if (!instances.length) {
    const empty = document.createElement('p');
    empty.className = 'asset-instance-empty';
    empty.textContent = 'No builds launched yet.';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'asset-instance-list';

  instances.forEach((instance, index) => {
    const item = document.createElement('li');
    item.className = 'asset-instance-item';
    item.dataset.instanceId = instance.id;

    const info = document.createElement('div');
    info.className = 'asset-instance-info';

    const title = document.createElement('span');
    title.className = 'asset-instance-name';
    title.textContent = instanceLabel(definition, index);

    const status = document.createElement('span');
    status.className = 'asset-instance-status';
    status.textContent = describeInstance(definition, instance);

    const earnings = document.createElement('span');
    earnings.className = 'asset-instance-earnings';
    earnings.textContent = describeInstanceEarnings(instance);

    info.append(title, status, earnings);

    const actions = document.createElement('div');
    actions.className = 'asset-instance-actions';

    const upgradeButton = document.createElement('button');
    upgradeButton.type = 'button';
    upgradeButton.className = 'secondary outline';
    upgradeButton.textContent = 'Upgrade';
    upgradeButton.disabled = instance.status !== 'active' || typeof ui?.extra?.openQuality !== 'function';
    upgradeButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (upgradeButton.disabled) return;
      ui.extra.openQuality(instance.id);
    });
    actions.appendChild(upgradeButton);

    const price = calculateAssetSalePrice(instance);
    const sellButton = document.createElement('button');
    sellButton.type = 'button';
    sellButton.className = 'secondary';
    sellButton.textContent = price > 0
      ? `Sell for $${formatMoney(price)}`
      : 'No buyer yet';
    sellButton.disabled = price <= 0;
    sellButton.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      sellAssetInstance(definition, instance.id);
    });

    actions.appendChild(sellButton);

    item.append(info, actions);
    list.appendChild(item);
  });

  container.appendChild(list);
}

export function enableAssetInstanceList(definition) {
  if (!definition || definition.__instancesEnabled) return;
  definition.__instancesEnabled = true;

  const originalExtra = definition.extraContent;
  definition.extraContent = (card, state) => {
    const extra = typeof originalExtra === 'function' ? (originalExtra(card, state) || {}) : {};
    const container = document.createElement('div');
    container.className = 'asset-instance-section';
    card.appendChild(container);
    return { ...extra, instanceList: container };
  };

  const originalUpdate = definition.update;
  definition.update = (state, ui) => {
    if (typeof originalUpdate === 'function') {
      originalUpdate(state, ui);
    }
    renderInstanceList(definition, state, ui);
  };
}
