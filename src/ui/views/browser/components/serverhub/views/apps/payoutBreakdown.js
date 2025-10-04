import { ensureArray } from '../../../../../../../core/helpers.js';

function renderPayoutBreakdown(instance, { formatCurrency, formatPercent }) {
  const section = document.createElement('section');
  section.className = 'serverhub-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Payout recap';
  section.appendChild(heading);

  const total = document.createElement('p');
  total.className = 'serverhub-panel__lead';
  total.textContent = `Yesterday: ${formatCurrency(instance.payoutBreakdown?.total || instance.latestPayout)}`;
  section.appendChild(total);

  const list = document.createElement('ul');
  list.className = 'serverhub-breakdown';

  const entries = ensureArray(instance.payoutBreakdown?.entries);
  if (!entries.length) {
    const item = document.createElement('li');
    item.textContent = 'Core subscriptions, no modifiers yesterday.';
    list.appendChild(item);
  } else {
    entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'serverhub-breakdown__item';

      const label = document.createElement('span');
      label.className = 'serverhub-breakdown__label';
      label.textContent = entry.label;

      const value = document.createElement('span');
      value.className = 'serverhub-breakdown__value';
      const percent = entry.percent !== null && entry.percent !== undefined
        ? ` (${formatPercent(entry.percent)})`
        : '';
      value.textContent = `${formatCurrency(entry.amount)}${percent}`;

      item.append(label, value);
      list.appendChild(item);
    });
  }

  section.appendChild(list);
  return section;
}

export default renderPayoutBreakdown;
