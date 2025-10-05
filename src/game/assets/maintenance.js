import { formatHours, formatMoney } from '../../core/helpers.js';

export function formatMaintenanceSummary(definition) {
  const maintenance = definition?.maintenance || {};
  const hours = Math.max(0, Number(maintenance.hours) || 0);
  const cost = Math.max(0, Number(maintenance.cost) || 0);
  const parts = [];
  if (hours > 0) {
    parts.push(`${formatHours(hours)}/day`);
  }
  if (cost > 0) {
    parts.push(`$${formatMoney(cost)}/day`);
  }
  const text = parts.join(' • ');
  const detailText = parts.join(' + ');
  return {
    hours,
    cost,
    parts,
    text,
    detailText,
    hasUpkeep: parts.length > 0
  };
}

export function maintenanceDetail(definition) {
  const summary = formatMaintenanceSummary(definition);
  if (!summary.hasUpkeep) {
    return '🛠 Maintenance: <strong>None</strong>';
  }
  return `🛠 Maintenance: <strong>${summary.detailText}</strong>`;
}

