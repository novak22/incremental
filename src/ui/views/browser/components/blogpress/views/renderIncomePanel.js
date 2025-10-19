export default function renderIncomePanel({
  instance,
  formatCurrency,
  formatNetCurrency,
  formatPercent = value => String(value ?? '')
}) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--earnings';

  const title = document.createElement('h3');
  title.textContent = 'Earnings & Upkeep';
  panel.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'blogpress-earnings__grid';

  const incomeSection = document.createElement('section');
  incomeSection.className = 'blogpress-earnings__section';
  const incomeTitle = document.createElement('h4');
  incomeTitle.textContent = 'Income recap';
  incomeSection.appendChild(incomeTitle);

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

  incomeSection.appendChild(stats);
  grid.appendChild(incomeSection);

  const payoutSection = document.createElement('section');
  payoutSection.className = 'blogpress-earnings__section';
  const payoutTitle = document.createElement('h4');
  payoutTitle.textContent = 'Payout recap';
  payoutSection.appendChild(payoutTitle);

  const payoutLead = document.createElement('p');
  payoutLead.className = 'blogpress-earnings__lead';
  payoutLead.textContent = instance.latestPayout > 0
    ? `Latest payout: ${formatCurrency(instance.latestPayout)}`
    : 'No payout logged yesterday.';
  payoutSection.appendChild(payoutLead);

  if (instance.payoutBreakdown?.entries?.length) {
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
      value.textContent = amount >= 0
        ? `+${formatCurrency(amount)}`
        : `−${formatCurrency(Math.abs(amount))}`;
      item.append(label, value);
      list.appendChild(item);
    });
    payoutSection.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'blogpress-panel__hint';
    empty.textContent = 'Run quick actions and fund upkeep to unlock modifier breakdowns.';
    payoutSection.appendChild(empty);
  }

  grid.appendChild(payoutSection);
  panel.appendChild(grid);

  const upkeepSection = document.createElement('section');
  upkeepSection.className = 'blogpress-earnings__section blogpress-earnings__section--upkeep';
  const upkeepTitle = document.createElement('h4');
  upkeepTitle.textContent = 'Daily upkeep';
  upkeepSection.appendChild(upkeepTitle);

  const maintenance = instance.maintenance || {};
  const status = document.createElement('span');
  status.className = 'blogpress-upkeep__status';
  if (!maintenance.hasUpkeep) {
    status.dataset.state = 'none';
    status.textContent = 'No upkeep required';
  } else if (instance.maintenanceFunded) {
    status.dataset.state = 'funded';
    status.textContent = 'Funded today';
  } else {
    status.dataset.state = 'due';
    status.textContent = 'Due today';
  }
  upkeepSection.appendChild(status);

  const upkeepNote = document.createElement('p');
  upkeepNote.className = 'blogpress-panel__lead';
  upkeepNote.textContent = maintenance.hasUpkeep ? maintenance.text : 'Keep vibing — no upkeep costs yet.';
  upkeepSection.appendChild(upkeepNote);

  const upkeepMessage = document.createElement('p');
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
  upkeepSection.appendChild(upkeepMessage);

  panel.appendChild(upkeepSection);

  const events = Array.isArray(instance.events) ? instance.events : [];
  if (events.length) {
    const modifiers = document.createElement('details');
    modifiers.className = 'blogpress-earnings__details';

    const summary = document.createElement('summary');
    summary.className = 'blogpress-earnings__details-summary';
    summary.textContent = 'Live modifiers';
    modifiers.appendChild(summary);

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

    modifiers.appendChild(eventList);
    panel.appendChild(modifiers);
  }

  return panel;
}
