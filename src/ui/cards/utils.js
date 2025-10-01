import { formatHours, formatMoney } from '../../core/helpers.js';

export function formatLabelFromKey(id, fallback = 'Special') {
  if (!id) return fallback;
  return (
    id
      .toString()
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, match => match.toUpperCase())
      .trim() || fallback
  );
}

export function describeAssetCardSummary(definition) {
  const copy = definition?.cardSummary || definition?.summary || definition?.description;
  if (!copy) return '';
  const trimmed = copy.trim();
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 137)}...`;
}

export function formatInstanceUpkeep(definition) {
  if (!definition) return '';
  const maintenance = definition.maintenance || {};
  const hours = Number(maintenance.hours) || 0;
  const cost = Number(maintenance.cost) || 0;
  const parts = [];
  if (hours > 0) {
    parts.push(`${formatHours(hours)}/day`);
  }
  if (cost > 0) {
    parts.push(`$${formatMoney(cost)}/day`);
  }
  return parts.join(' • ');
}

export default {
  formatLabelFromKey,
  describeAssetCardSummary,
  formatInstanceUpkeep
};
