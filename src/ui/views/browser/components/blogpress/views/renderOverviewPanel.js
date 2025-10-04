export default function renderOverviewPanel({ instance, formatCurrency }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--overview';

  const title = document.createElement('h2');
  title.textContent = instance.label;
  panel.appendChild(title);

  const badge = document.createElement('span');
  badge.className = `blogpress-badge blogpress-badge--${instance.status?.id || 'setup'}`;
  badge.textContent = instance.status?.label || 'Setup';
  panel.appendChild(badge);

  const list = document.createElement('dl');
  list.className = 'blogpress-stats';

  const stats = [
    { label: 'Lifetime income', value: formatCurrency(instance.lifetimeIncome) },
    { label: 'Estimated spend', value: formatCurrency(instance.estimatedSpend) },
    {
      label: 'Yesterday payout',
      value: instance.latestPayout > 0 ? formatCurrency(instance.latestPayout) : '—'
    },
    {
      label: 'Average / day',
      value: instance.averagePayout > 0 ? formatCurrency(instance.averagePayout) : 'No earnings yet'
    },
    {
      label: 'Pending payout',
      value: instance.pendingIncome > 0 ? formatCurrency(instance.pendingIncome) : 'None in queue'
    }
  ];

  stats.forEach(entry => {
    const dt = document.createElement('dt');
    dt.textContent = entry.label;
    const dd = document.createElement('dd');
    dd.textContent = entry.value;
    list.append(dt, dd);
  });

  panel.appendChild(list);
  return panel;
}
