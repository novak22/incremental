import { ensureArray } from '../../../../../../../core/helpers.js';

export default function createStatsSection(instance, helpers = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    formatSignedCurrency = value => String(value ?? ''),
    formatPercent = value => String(value ?? '')
  } = helpers;
  const fragment = document.createDocumentFragment();
  const list = document.createElement('dl');
  list.className = 'shopily-stats';
  const entries = [
    { label: 'Latest payout', value: formatCurrency(instance.latestPayout || 0) },
    { label: 'Average / day', value: formatCurrency(instance.averagePayout || 0) },
    { label: 'Lifetime sales', value: formatCurrency(instance.lifetimeIncome || 0) },
    { label: 'Lifetime spend', value: formatCurrency(instance.lifetimeSpend || 0) },
    { label: 'Profit to date', value: formatSignedCurrency(instance.profit || 0) },
    { label: 'Lifetime ROI', value: formatPercent(instance.roi) },
    { label: 'Resale value', value: formatCurrency(instance.resaleValue || 0) }
  ];
  entries.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'shopily-stats__row';
    const term = document.createElement('dt');
    term.textContent = entry.label;
    const value = document.createElement('dd');
    value.textContent = entry.value;
    row.append(term, value);
    list.appendChild(row);
  });
  fragment.appendChild(list);
  if (!instance.maintenanceFunded) {
    const warning = document.createElement('p');
    warning.className = 'shopily-panel__warning';
    warning.textContent = 'Maintenance unfunded — cover daily upkeep to avoid shutdowns.';
    fragment.appendChild(warning);
  }
  if (ensureArray(instance.maintenance?.parts).length) {
    const upkeep = document.createElement('p');
    upkeep.className = 'shopily-panel__note';
    upkeep.textContent = `Daily upkeep: ${instance.maintenance.parts.join(' • ')}`;
    fragment.appendChild(upkeep);
  }
  return fragment;
}
