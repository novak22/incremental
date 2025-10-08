export default function renderOverviewPanel({ instance, formatCurrency }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--overview';

  const header = document.createElement('div');
  header.className = 'blogpress-overview__header';

  const title = document.createElement('h2');
  title.textContent = instance.label;
  header.appendChild(title);

  const badge = document.createElement('span');
  badge.className = `blogpress-badge blogpress-badge--${instance.status?.id || 'setup'}`;
  badge.textContent = instance.status?.label || 'Setup';
  header.appendChild(badge);

  panel.appendChild(header);

  const subhead = document.createElement('p');
  subhead.className = 'blogpress-overview__hint';
  subhead.textContent = 'Track payouts, upkeep, and vibe in one comfy dashboard.';
  panel.appendChild(subhead);

  const url = document.createElement('div');
  url.className = 'blogpress-overview__url';
  const slug = instance.id || 'draft';
  url.textContent = `https://blogpress.hub/blog/${slug}`;
  panel.appendChild(url);

  const list = document.createElement('dl');
  list.className = 'blogpress-stats blogpress-stats--compact';

  const stats = [
    {
      label: 'Lifetime income',
      value: formatCurrency(instance.lifetimeIncome)
    },
    {
      label: 'Lifetime spend',
      value: formatCurrency(instance.estimatedSpend)
    },
    {
      label: 'Latest payout',
      value: instance.latestPayout > 0 ? formatCurrency(instance.latestPayout) : 'None yet'
    },
    {
      label: 'Daily average',
      value: instance.averagePayout > 0 ? formatCurrency(instance.averagePayout) : '$0'
    },
    {
      label: 'Pending payout',
      value: instance.pendingIncome > 0 ? formatCurrency(instance.pendingIncome) : 'None in queue'
    },
    instance.daysActive > 0
      ? {
          label: 'Days live',
          value: instance.daysActive === 1 ? '1 day' : `${instance.daysActive} days`
        }
      : null
  ].filter(Boolean);

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
