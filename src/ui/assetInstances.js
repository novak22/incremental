import { formatMoney } from '../core/helpers.js';
import { getAssetState } from '../core/state.js';
import { calculateAssetSalePrice, instanceLabel, sellAssetInstance } from '../game/assets/helpers.js';
import { getQualityNextRequirements, getQualityTracks } from '../game/assets/quality.js';

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

export function calculateInstanceNetDaily(definition, instance) {
  if (!definition || !instance) return null;
  if (instance.status !== 'active') return null;
  const income = Math.max(0, Number(instance.lastIncome) || 0);
  const upkeepCost = Math.max(0, Number(definition.maintenance?.cost) || 0);
  return income - upkeepCost;
}

export function calculateInstanceNetHourly(definition, instance) {
  if (!definition || !instance) return null;
  if (instance.status !== 'active') return null;
  const upkeepHours = Math.max(0, Number(definition.maintenance?.hours) || 0);
  if (upkeepHours <= 0) return null;
  const netDaily = calculateInstanceNetDaily(definition, instance);
  if (netDaily === null) return null;
  return netDaily / upkeepHours;
}

export function describeInstanceNetHourly(definition, instance) {
  const netHourly = calculateInstanceNetHourly(definition, instance);
  if (netHourly === null) {
    return instance.status === 'active' ? 'No upkeep hours' : 'Launch pending';
  }
  const absolute = Math.abs(netHourly);
  const formatted = formatMoney(Math.round(absolute * 100) / 100);
  const prefix = netHourly < 0 ? '-$' : '$';
  return `${prefix}${formatted}/hr`;
}

export function describeNextQualityRequirements(definition, instance) {
  if (!definition || !instance || instance.status !== 'active') {
    return [];
  }

  const nextRequirements = getQualityNextRequirements(definition, Number(instance.quality?.level) || 0);
  if (!nextRequirements) {
    return [];
  }

  const tracks = getQualityTracks(definition);
  const progress = instance.quality?.progress || {};

  return Object.entries(nextRequirements)
    .map(([key, target]) => {
      const numericTarget = Number(target);
      if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
        return null;
      }
      const current = Number(progress?.[key]) || 0;
      const track = tracks?.[key] || {};
      const label = track.shortLabel || track.label || key;
      return {
        key,
        label,
        current,
        target: numericTarget,
        met: current >= numericTarget
      };
    })
    .filter(Boolean);
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
