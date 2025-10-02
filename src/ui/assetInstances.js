import { formatMoney } from '../core/helpers.js';
import { calculateAssetSalePrice, sellAssetInstance } from '../game/assets/actions.js';
import { instanceLabel } from '../game/assets/details.js';

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
