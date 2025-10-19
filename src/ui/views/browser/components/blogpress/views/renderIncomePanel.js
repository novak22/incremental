export default function renderIncomePanel({
  instance,
  formatCurrency,
  formatNetCurrency,
  formatPercent = value => String(value ?? '')
}) {
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

  const events = Array.isArray(instance.events) ? instance.events : [];
  if (events.length) {
    const eventTitle = document.createElement('p');
    eventTitle.className = 'blogpress-panel__section-title';
    eventTitle.textContent = 'Live modifiers';
    panel.appendChild(eventTitle);

    const eventList = document.createElement('ul');
    eventList.className = 'blogpress-list';
    events.forEach(event => {
      const item = document.createElement('li');
      item.className = 'blogpress-list__item';

      const label = document.createElement('span');
      label.className = 'blogpress-list__label';
      const toneLabel = event.tone === 'positive'
        ? 'boost'
        : event.tone === 'negative'
          ? 'dip'
          : 'pulse';
      const sourceLabel = event.source === 'niche' ? 'Trend' : 'Blog';
      label.textContent = `${sourceLabel} ${toneLabel}: ${event.label}`;

      const value = document.createElement('span');
      value.className = 'blogpress-list__value';
      const percentText = typeof formatPercent === 'function'
        ? formatPercent(event.percent || 0)
        : `${Math.round((Number(event.percent) || 0) * 100)}%`;
      const remaining = typeof event.remainingDays === 'number' && Number.isFinite(event.remainingDays)
        ? Math.max(0, event.remainingDays)
        : null;
      let timing;
      if (remaining === 0) {
        timing = 'Final day';
      } else if (remaining === 1) {
        timing = '1 day left';
      } else if (remaining != null) {
        timing = `${remaining} days left`;
      }
      value.textContent = timing ? `${percentText} • ${timing}` : percentText;

      item.append(label, value);
      eventList.appendChild(item);
    });

    panel.appendChild(eventList);
  }

  const upkeepMessage = document.createElement('p');
  const maintenance = instance.maintenance || {};
  const upkeepSummary = maintenance.hasUpkeep ? maintenance.text : 'No upkeep';
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
