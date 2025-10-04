export default function renderPayoutPanel({ instance, formatCurrency }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--payout';
  const title = document.createElement('h3');
  title.textContent = 'Payout recap';
  panel.appendChild(title);

  const total = document.createElement('p');
  total.className = 'blogpress-panel__lead';
  total.textContent = instance.latestPayout > 0
    ? `Latest payout: ${formatCurrency(instance.latestPayout)}`
    : 'No payout logged yesterday.';
  panel.appendChild(total);

  if (instance.payoutBreakdown.entries.length) {
    const list = document.createElement('ul');
    list.className = 'blogpress-list';
    instance.payoutBreakdown.entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'blogpress-list__item';
      const label = document.createElement('span');
      label.className = 'blogpress-list__label';
      label.textContent = entry.label;
      const value = document.createElement('span');
      value.className = 'blogpress-list__value';
      const amount = Number(entry.amount) || 0;
      value.textContent = amount >= 0 ? `+${formatCurrency(amount)}` : `−${formatCurrency(Math.abs(amount))}`;
      item.append(label, value);
      list.appendChild(item);
    });
    panel.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'blogpress-panel__hint';
    empty.textContent = 'Run quick actions and fund upkeep to unlock modifier breakdowns.';
    panel.appendChild(empty);
  }

  return panel;
}
