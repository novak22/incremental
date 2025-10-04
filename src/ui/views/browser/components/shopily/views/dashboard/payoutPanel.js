import { ensureArray } from '../../../../../../../core/helpers.js';

export default function createPayoutSection(instance, helpers = {}) {
  const { formatCurrency = value => String(value ?? ''), formatPercent = value => String(value ?? '') } = helpers;
  const fragment = document.createDocumentFragment();
  const entries = ensureArray(instance.payoutBreakdown?.entries);
  if (!entries.length) {
    const note = document.createElement('p');
    note.className = 'shopily-panel__note';
    note.textContent = 'No payout modifiers yet. Unlock upgrades and courses to stack multipliers.';
    fragment.appendChild(note);
  } else {
    const list = document.createElement('ul');
    list.className = 'shopily-list';
    entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'shopily-list__item';
      const label = document.createElement('span');
      label.className = 'shopily-list__label';
      label.textContent = entry.label;
      const value = document.createElement('span');
      value.className = 'shopily-list__value';
      const amount = formatCurrency(entry.amount || 0);
      const percent =
        entry.percent !== null && entry.percent !== undefined ? ` (${formatPercent(entry.percent)})` : '';
      value.textContent = `${amount}${percent}`;
      item.append(label, value);
      list.appendChild(item);
    });
    fragment.appendChild(list);
  }
  const total = document.createElement('p');
  total.className = 'shopily-panel__note';
  total.textContent = `Yesterday’s total: ${formatCurrency(instance.payoutBreakdown?.total || 0)}`;
  fragment.appendChild(total);
  return fragment;
}
