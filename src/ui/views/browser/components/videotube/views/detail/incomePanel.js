export default function renderIncomePanel(video, { formatCurrency, formatNetCurrency } = {}) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';

  const title = document.createElement('h3');
  title.textContent = 'Income recap';
  panel.appendChild(title);

  const stats = document.createElement('dl');
  stats.className = 'videotube-stats-grid';

  const averageCopy = video.averagePayout > 0
    ? formatCurrency?.(video.averagePayout)
    : video.status?.id === 'active'
      ? 'No earnings yet'
      : 'Launch pending';

  const entries = [
    { label: 'Daily average', value: averageCopy },
    {
      label: 'Latest payout',
      value: video.latestPayout > 0 ? formatCurrency?.(video.latestPayout) : '—'
    },
    {
      label: 'Lifetime income',
      value: formatCurrency?.(video.lifetimeIncome ?? 0) ?? ''
    },
    {
      label: 'Lifetime spend',
      value:
        typeof video.lifetimeSpend === 'number'
          ? formatCurrency?.(video.lifetimeSpend)
          : '—'
    },
    {
      label: 'Lifetime net',
      value:
        typeof video.lifetimeNet === 'number'
          ? formatNetCurrency?.(video.lifetimeNet)
          : '—'
    },
    {
      label: 'Pending payout',
      value: video.pendingIncome > 0 ? formatCurrency?.(video.pendingIncome) : 'No payout queued'
    }
  ];

  if (video.daysActive > 0) {
    const daysLabel = video.daysActive === 1 ? '1 day' : `${video.daysActive} days`;
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
  const maintenance = video.maintenance || {};
  const upkeepSummary = maintenance.hasUpkeep ? maintenance.text : 'No upkeep';

  if (video.status?.id === 'active') {
    if (!maintenance.hasUpkeep) {
      upkeepMessage.className = 'videotube-panel__hint';
      upkeepMessage.textContent = 'No upkeep required — payouts roll in automatically at day end.';
    } else if (video.maintenanceFunded) {
      upkeepMessage.className = 'videotube-panel__hint';
      upkeepMessage.textContent = `Upkeep covered today (${upkeepSummary}). Expect the payout at day end.`;
    } else {
      upkeepMessage.className = 'videotube-panel__note';
      upkeepMessage.textContent = `Upkeep still due (${upkeepSummary}). Fund hours or cash to restart payouts.`;
    }
  } else {
    upkeepMessage.className = 'videotube-panel__hint';
    upkeepMessage.textContent = 'Income tracking begins once launch prep wraps.';
  }

  panel.appendChild(upkeepMessage);

  return panel;
}
