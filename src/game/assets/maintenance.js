import { formatHours, formatMoney } from '../../core/helpers.js';

export function formatMaintenanceSummary(definition) {
  const maintenance = definition?.maintenance || {};
  const hours = Number(maintenance.hours) || 0;
  const cost = Number(maintenance.cost) || 0;
  const parts = [];
  if (hours > 0) {
    parts.push(`${formatHours(hours)}/day`);
  }
  if (cost > 0) {
    parts.push(`$${formatMoney(cost)}/day`);
  }
  return {
    parts,
    hasUpkeep: parts.length > 0
  };
}

export function maintenanceDetail(definition) {
  const summary = formatMaintenanceSummary(definition);
  if (!summary.hasUpkeep) {
    return '🛠 Maintenance: <strong>None</strong>';
  }
  return `🛠 Maintenance: <strong>${summary.parts.join(' + ')}</strong>`;
}

