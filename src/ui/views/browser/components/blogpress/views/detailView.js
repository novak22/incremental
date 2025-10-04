function createBackButton(onBack = () => {}, label = 'Back to blogs') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'blogpress-button blogpress-button--link';
  button.textContent = label;
  button.addEventListener('click', onBack);
  return button;
}

function renderOverviewPanel(instance, formatCurrency) {
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

function renderNichePanel(instance, handlers = {}) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--niche';

  const title = document.createElement('h3');
  title.textContent = 'Audience niche';
  panel.appendChild(title);

  const current = document.createElement('p');
  current.className = 'blogpress-panel__lead';
  current.textContent = instance.niche?.name || 'Unassigned — pick a specialty once and lock it in.';
  panel.appendChild(current);

  if (instance.niche?.summary) {
    const summary = document.createElement('p');
    summary.className = 'blogpress-panel__note';
    summary.textContent = instance.niche.summary;
    panel.appendChild(summary);
  }

  if (!instance.nicheLocked) {
    const field = document.createElement('label');
    field.className = 'blogpress-field';
    field.textContent = 'Choose niche';

    const select = document.createElement('select');
    select.className = 'blogpress-select';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a niche';
    select.appendChild(placeholder);
    instance.nicheOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = option.label ? `${option.name} (${option.label})` : option.name;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      if (!select.value) return;
      if (handlers.onSelectNiche) handlers.onSelectNiche(instance.id, select.value);
      if (handlers.onViewDetail) handlers.onViewDetail(instance.id);
    });
    field.appendChild(select);
    const hint = document.createElement('p');
    hint.className = 'blogpress-panel__hint';
    hint.textContent = 'Niches lock after selection, so pick the trend that feels dreamy.';
    panel.append(field, hint);
  } else {
    const locked = document.createElement('p');
    locked.className = 'blogpress-panel__hint';
    locked.textContent = 'Niche locked — ride the trend or pair with boosts to pivot later.';
    panel.appendChild(locked);
  }

  return panel;
}

function renderQualityPanel(instance, formatRange) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--quality';

  const header = document.createElement('div');
  header.className = 'blogpress-panel__header';
  const title = document.createElement('h3');
  title.textContent = `Quality ${instance.qualityLevel} — ${instance.qualityInfo?.name || 'Skeleton Drafts'}`;
  header.appendChild(title);
  panel.appendChild(header);

  if (instance.qualityInfo?.description) {
    const description = document.createElement('p');
    description.className = 'blogpress-panel__note';
    description.textContent = instance.qualityInfo.description;
    panel.appendChild(description);
  }

  const progress = document.createElement('div');
  progress.className = 'blogpress-progress';
  const fill = document.createElement('div');
  fill.className = 'blogpress-progress__fill';
  fill.style.width = `${Math.round((instance.milestone.percent || 0) * 100)}%`;
  progress.appendChild(fill);
  panel.appendChild(progress);

  if (instance.milestone.nextLevel) {
    const milestone = document.createElement('p');
    milestone.className = 'blogpress-panel__note';
    milestone.textContent = `Next milestone: Quality ${instance.milestone.nextLevel.level} — ${instance.milestone.nextLevel.name}. ${instance.milestone.nextLevel.description || ''}`;
    panel.appendChild(milestone);
  } else {
    const milestone = document.createElement('p');
    milestone.className = 'blogpress-panel__note';
    milestone.textContent = 'Top tier unlocked — this blog is shining bright!';
    panel.appendChild(milestone);
  }

  const summary = document.createElement('p');
  summary.className = 'blogpress-panel__hint';
  summary.textContent = instance.milestone.summary;
  panel.appendChild(summary);

  const range = document.createElement('p');
  range.className = 'blogpress-panel__range';
  range.textContent = `Daily range at this tier: ${formatRange(instance.qualityRange)}`;
  panel.appendChild(range);

  return panel;
}

function renderIncomePanel(instance, formatCurrency, formatNetCurrency) {
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

function renderPayoutPanel(instance, formatCurrency) {
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

function renderActionPanel(instance, handlers = {}, formatHours, formatCurrency) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--actions';
  const title = document.createElement('h3');
  title.textContent = 'Upgrade actions';
  panel.appendChild(title);

  if (!instance.actions.length) {
    const note = document.createElement('p');
    note.className = 'blogpress-panel__hint';
    note.textContent = 'No quality actions unlocked yet. Progress through story beats to reveal them.';
    panel.appendChild(note);
    return panel;
  }

  const list = document.createElement('ul');
  list.className = 'blogpress-action-list';

  instance.actions.forEach(action => {
    const item = document.createElement('li');
    item.className = 'blogpress-action';
    const label = document.createElement('div');
    label.className = 'blogpress-action__label';
    label.textContent = action.label;
    const meta = document.createElement('span');
    meta.className = 'blogpress-action__meta';
    const parts = [];
    if (action.time > 0) parts.push(formatHours(action.time));
    if (action.cost > 0) parts.push(formatCurrency(action.cost));
    meta.textContent = parts.length ? parts.join(' • ') : 'Instant';
    label.appendChild(meta);
    item.appendChild(label);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'blogpress-button blogpress-button--primary';
    button.textContent = action.available ? 'Run' : 'Locked';
    button.disabled = !action.available;
    if (action.disabledReason) {
      button.title = action.disabledReason;
    }
    button.addEventListener('click', () => {
      if (button.disabled) return;
      if (handlers.onRunAction) handlers.onRunAction(instance.id, action.id);
    });
    item.appendChild(button);

    list.appendChild(item);
  });

  panel.appendChild(list);
  return panel;
}

function renderUpkeepPanel(instance) {
  const panel = document.createElement('article');
  panel.className = 'blogpress-panel blogpress-panel--upkeep';
  const title = document.createElement('h3');
  title.textContent = 'Daily upkeep';
  panel.appendChild(title);

  const upkeepParts = instance.maintenance?.parts || [];
  const note = document.createElement('p');
  note.className = 'blogpress-panel__lead';
  note.textContent = upkeepParts.length ? upkeepParts.join(' • ') : 'No upkeep required';
  panel.appendChild(note);

  if (instance.status?.id === 'active' && !instance.maintenanceFunded) {
    const warning = document.createElement('p');
    warning.className = 'blogpress-panel__warning';
    warning.textContent = 'Upkeep missed today — fund it to unlock tomorrow’s payout.';
    panel.appendChild(warning);
  } else {
    const hint = document.createElement('p');
    hint.className = 'blogpress-panel__hint';
    hint.textContent = 'Keep hours and cash funded to secure the next payday.';
    panel.appendChild(hint);
  }

  return panel;
}

export default function renderDetailView(options = {}) {
  const {
    instance = null,
    formatters = {},
    handlers = {},
    formatRange = () => 'No payout yet'
  } = options;

  if (!instance) {
    return null;
  }

  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const formatNetCurrency = formatters.formatNetCurrency || ((value) => String(value ?? ''));
  const formatHours = formatters.formatHours || (value => String(value ?? ''));

  const container = document.createElement('section');
  container.className = 'blogpress-view blogpress-view--detail';

  container.appendChild(createBackButton(handlers.onBack));
  container.appendChild(renderOverviewPanel(instance, formatCurrency));

  const grid = document.createElement('div');
  grid.className = 'blogpress-detail-grid';
  grid.append(
    renderNichePanel(instance, {
      onSelectNiche: handlers.onSelectNiche,
      onViewDetail: handlers.onViewDetail
    }),
    renderQualityPanel(instance, formatRange),
    renderIncomePanel(instance, formatCurrency, formatNetCurrency),
    renderPayoutPanel(instance, formatCurrency),
    renderActionPanel(instance, handlers, formatHours, formatCurrency),
    renderUpkeepPanel(instance)
  );
  container.appendChild(grid);

  return container;
}
