export default function renderIncomePanel({ instance, formatCurrency, formatNetCurrency }) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--income';

  const title = document.createElement('h3');
  title.textContent = 'Income recap';
  panel.appendChild(title);

  const stats = document.createElement('dl');
  stats.className = 'blogpress-stats';

  const entries = [
    {
      label: 'Daily average',
      value:
        instance.averagePayout > 0
          ? formatCurrency(instance.averagePayout)
          : instance.status?.id === 'active'
            ? 'No earnings yet'
            : 'Launch pending'
    },
    {
      label: 'Latest payout',
      value: instance.latestPayout > 0 ? formatCurrency(instance.latestPayout) : '—'
    },
    {
      label: 'Lifetime income',
      value: formatCurrency(instance.lifetimeIncome)
    },
    {
      label: 'Lifetime spend',
      value: formatCurrency(instance.estimatedSpend)
    },
    {
      label: 'Lifetime net',
      value: formatNetCurrency(instance.lifetimeNet || 0, { precision: 'integer', zeroDisplay: '$0' })
    },
    {
      label: 'Pending payout',
      value: instance.pendingIncome > 0 ? formatCurrency(instance.pendingIncome) : 'No payout queued'
    }
  ];

  if (instance.daysActive > 0) {
    const daysLabel = instance.daysActive === 1 ? '1 day' : `${instance.daysActive} days`;
    entries.push({ label: 'Days live', value: daysLabel });
  }

  entries.forEach(entry => {
    const dt = document.createElement('dt');
    dt.textContent = entry.label;
    const dd = document.createElement('dd');
    dd.textContent = entry.value;
    stats.append(dt, dd);
  });

  panel.appendChild(stats);

  const upkeepMessage = document.createElement('p');
  const upkeepParts = instance.maintenance?.parts || [];
  const upkeepSummary = upkeepParts.length ? upkeepParts.join(' • ') : 'No upkeep';
  if (instance.status?.id === 'active') {
    if (instance.maintenanceFunded) {
      upkeepMessage.className = 'blogpress-panel__hint';
      upkeepMessage.textContent = `Upkeep covered today (${upkeepSummary}). Expect the payout at day end.`;
    } else {
      upkeepMessage.className = 'blogpress-panel__warning';
      upkeepMessage.textContent = `Upkeep still due (${upkeepSummary}). Fund hours or cash to restart payouts.`;
    }
  } else {
    upkeepMessage.className = 'blogpress-panel__hint';
    upkeepMessage.textContent = 'Income tracking begins once launch prep wraps.';
  }
  panel.appendChild(upkeepMessage);

  return panel;
}
