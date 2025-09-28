import { formatDays, formatHours, formatList, formatMoney } from '../../core/helpers.js';
import { addLog } from '../../core/log.js';
import {
  createAssetInstance,
  getAssetDefinition,
  getAssetState,
  getState
} from '../../core/state.js';
import { spendMoney } from '../currency.js';
import { executeAction } from '../actions.js';
import { checkDayEnd } from '../lifecycle.js';
import { spendTime } from '../time.js';
import { assetRequirementsMetById } from '../requirements.js';

export function buildAssetAction(definition, labels = {}) {
  return {
    label: () => assetActionLabel(definition, labels),
    className: 'primary',
    disabled: () => isAssetPurchaseDisabled(definition),
    onClick: () => startAsset(definition)
  };
}

function assetActionLabel(definition, labels) {
  const assetState = getAssetState(definition.id);
  const first = labels.first || `Launch ${definition.singular || definition.name}`;
  const repeat = labels.repeat || `Add Another ${definition.singular || definition.name}`;
  return assetState.instances.length ? repeat : first;
}

function isAssetPurchaseDisabled(definition) {
  if (!assetRequirementsMetById(definition.id)) return true;
  const state = getState();
  const setupHours = Number(definition.setup?.hoursPerDay) || 0;
  const setupCost = Number(definition.setup?.cost) || 0;
  if (setupHours > 0 && state.timeLeft < setupHours) return true;
  if (setupCost > 0 && state.money < setupCost) return true;
  return false;
}

function startAsset(definition) {
  executeAction(() => {
    if (!assetRequirementsMetById(definition.id)) {
      addLog(
        `You still need to meet the requirements before starting ${definition.singular || definition.name}.`,
        'info'
      );
      return;
    }

    const state = getState();
    const setupHours = Number(definition.setup?.hoursPerDay) || 0;
    const setupCost = Number(definition.setup?.cost) || 0;
    if (setupHours > 0 && state.timeLeft < setupHours) {
      addLog('You ran out of hours today. Tackle setup tomorrow after resting.', 'warning');
      return;
    }
    if (setupCost > 0 && state.money < setupCost) {
      addLog('You need more cash before covering that setup cost.', 'warning');
      return;
    }

    if (setupCost > 0) {
      spendMoney(setupCost);
    }
    if (setupHours > 0) {
      spendTime(setupHours);
    }

    const assetState = getAssetState(definition.id);
    const instance = createAssetInstance(definition, {
      setupFundedToday: setupHours > 0
    });
    assetState.instances.push(instance);

    const label = instanceLabel(definition, assetState.instances.length - 1);
    const message = definition.messages?.setupStarted
      ? definition.messages.setupStarted(label, assetState, instance)
      : `You kicked off ${label}. Keep investing time until it launches.`;
    addLog(message, 'passive');
  });
  checkDayEnd();
}

export function ownedDetail(definition) {
  const assetState = getAssetState(definition.id);
  const total = assetState.instances.length;
  if (!total) {
    return '📦 Owned: <strong>0</strong> (ready for your first build)';
  }
  const active = assetState.instances.filter(instance => instance.status === 'active').length;
  const setup = total - active;
  const parts = [];
  if (active) parts.push(`${active} active`);
  if (setup) parts.push(`${setup} in setup`);
  const suffix = parts.length ? ` (${parts.join(', ')})` : '';
  return `📦 Owned: <strong>${total}</strong>${suffix}`;
}

export function setupDetail(definition) {
  const days = Number(definition.setup?.days) || 0;
  const hoursPerDay = Number(definition.setup?.hoursPerDay) || 0;
  if (days <= 0 && hoursPerDay <= 0) {
    return '⏳ Setup: <strong>Instant</strong>';
  }
  if (days <= 1) {
    return `⏳ Setup: <strong>${formatHours(hoursPerDay)} investment</strong>`;
  }
  return `⏳ Setup: <strong>${formatDays(days)} · ${formatHours(hoursPerDay)}/day</strong>`;
}

export function setupCostDetail(definition) {
  const cost = Number(definition.setup?.cost) || 0;
  return `💵 Setup Cost: <strong>$${formatMoney(cost)}</strong>`;
}

export function maintenanceDetail(definition) {
  const hours = Number(definition.maintenance?.hours) || 0;
  const cost = Number(definition.maintenance?.cost) || 0;
  const hasHours = hours > 0;
  const hasCost = cost > 0;
  if (!hasHours && !hasCost) {
    return '🛠 Maintenance: <strong>None</strong>';
  }
  const parts = [];
  if (hasHours) {
    parts.push(`${formatHours(hours)}/day`);
  }
  if (hasCost) {
    parts.push(`$${formatMoney(cost)}/day`);
  }
  return `🛠 Maintenance: <strong>${parts.join(' + ')}</strong>`;
}

export function incomeDetail(definition) {
  const { min, max } = getDailyIncomeRange(definition);
  return `💸 Income: <strong>$${formatMoney(min)} - $${formatMoney(max)} / day</strong> per ${
    definition.singular || 'asset'
  }`;
}

export function latestYieldDetail(definition) {
  const assetState = getAssetState(definition.id);
  const active = assetState.instances.filter(instance => instance.status === 'active');
  if (!active.length) {
    return '📊 Latest Yield: <strong>$0</strong> (no active instances)';
  }
  const average = active.reduce((sum, instance) => sum + (Number(instance.lastIncome) || 0), 0) / active.length;
  return `📊 Latest Yield: <strong>$${formatMoney(Math.round(average))}</strong> avg per active instance`;
}

export function instanceLabel(definition, index) {
  const base = definition.singular || definition.name;
  return `${base} #${index + 1}`;
}

export function getDailyIncomeRange(definition) {
  const base = Math.max(0, Number(definition.income?.base) || 0);
  const variance = Math.max(0, Number(definition.income?.variance) || 0);
  const min = definition.income?.floor ?? Math.round(base * (1 - variance));
  const max = definition.income?.ceiling ?? Math.round(base * (1 + variance));
  return {
    min: Math.max(0, min),
    max: Math.max(Math.max(0, min), max)
  };
}

export function rollDailyIncome(definition, assetState, instance) {
  const { min, max } = getDailyIncomeRange(definition);
  const roll = min + Math.random() * Math.max(0, max - min);
  const rounded = Math.round(roll);
  if (typeof definition.income?.modifier === 'function') {
    return Math.max(0, Math.round(definition.income.modifier(rounded, { definition, assetState, instance })));
  }
  return Math.max(0, rounded);
}

export function getIncomeRangeForDisplay(assetId) {
  const definition = getAssetDefinition(assetId);
  if (!definition) return { min: 0, max: 0 };
  return getDailyIncomeRange(definition);
}

export { assetActionLabel, isAssetPurchaseDisabled, startAsset };
