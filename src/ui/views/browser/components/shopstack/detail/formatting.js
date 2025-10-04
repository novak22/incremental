import { formatMoney, ensureArray } from '../../../../../../core/helpers.js';

export function formatPrice(amount = 0) {
  const numeric = Number(amount) || 0;
  return `$${formatMoney(Math.max(0, Math.round(numeric)))}`;
}

export function formatKeyLabel(key) {
  if (!key) return '';
  return key
    .toString()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, char => char.toUpperCase());
}

export function describeTargetScope(scope) {
  if (!scope || typeof scope !== 'object') return '';
  const tags = ensureArray(scope.tags).map(tag => `#${tag}`);
  const ids = ensureArray(scope.ids);
  const families = ensureArray(scope.families).map(formatKeyLabel);
  const categories = ensureArray(scope.categories).map(formatKeyLabel);
  const fragments = [];
  if (ids.length) fragments.push(ids.join(', '));
  if (families.length) fragments.push(`${families.join(', ')} family`);
  if (categories.length) fragments.push(`${categories.join(', ')} category`);
  if (tags.length) fragments.push(tags.join(' • '));
  return fragments.join(' • ');
}

export function formatSlotLabel(slot, amount) {
  const label = formatKeyLabel(slot);
  const value = Math.abs(Number(amount) || 0);
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  const plural = rounded === 1 ? '' : 's';
  return `${rounded} ${label} slot${plural}`;
}

export function formatSlotMap(map) {
  if (!map || typeof map !== 'object') return '';
  return Object.entries(map)
    .map(([slot, amount]) => formatSlotLabel(slot, amount))
    .join(', ');
}

export function stripHtml(value) {
  if (typeof value !== 'string') {
    if (typeof Node !== 'undefined' && value instanceof Node) {
      return value.textContent || '';
    }
    return '';
  }
  const temp = document.createElement('div');
  temp.innerHTML = value;
  return temp.textContent || '';
}

export default {
  formatPrice,
  formatKeyLabel,
  describeTargetScope,
  formatSlotLabel,
  formatSlotMap,
  stripHtml
};
