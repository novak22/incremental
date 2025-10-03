import { ensureArray } from '../../../../../core/helpers.js';

function formatNicheDelta(delta, formatPercent) {
  if (delta === null || delta === undefined) return '';
  const numeric = Number(delta);
  if (!Number.isFinite(numeric) || numeric === 0) return '';
  const icon = numeric > 0 ? '⬆️' : '⬇️';
  return `${icon} ${Math.abs(Math.round(numeric * 100))}%`;
}

function renderQualityPanel(instance, formatters = {}) {
  const panel = document.createElement('section');
  panel.className = 'shopily-panel';

  const heading = document.createElement('h3');
  heading.textContent = `Quality ${instance.qualityLevel}`;
  panel.appendChild(heading);

  if (instance.qualityInfo?.description) {
    const note = document.createElement('p');
    note.className = 'shopily-panel__note';
    note.textContent = instance.qualityInfo.description;
    panel.appendChild(note);
  }

  const progress = document.createElement('div');
  progress.className = 'shopily-progress';
  const fill = document.createElement('div');
  fill.className = 'shopily-progress__fill';
  fill.style.setProperty('--shopily-progress', String((instance.milestone?.percent || 0) * 100));
  progress.appendChild(fill);

  const summary = document.createElement('p');
  summary.className = 'shopily-panel__note';
  summary.textContent = instance.milestone?.summary || 'Push quality actions to unlock the next tier.';

  panel.append(progress, summary);
  return panel;
}

function renderNichePanel(instance, dependencies = {}) {
  const { formatPercent = value => String(value ?? ''), onSelectNiche = () => {} } = dependencies;

  const panel = document.createElement('section');
  panel.className = 'shopily-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Audience niche';
  panel.appendChild(heading);

  if (instance.niche) {
    const nicheLine = document.createElement('p');
    nicheLine.className = 'shopily-panel__lead';
    nicheLine.textContent = instance.niche.name;
    panel.appendChild(nicheLine);

    const vibe = document.createElement('p');
    vibe.className = 'shopily-panel__note';
    const delta = formatNicheDelta(instance.niche.delta, formatPercent);
    const boost = formatPercent(instance.niche.multiplier - 1);
    vibe.textContent = `${instance.niche.summary || 'Trend snapshot unavailable.'} ${
      delta ? `(${delta})` : boost !== '—' ? `(${boost})` : ''
    }`.trim();
    panel.appendChild(vibe);
  } else {
    const empty = document.createElement('p');
    empty.className = 'shopily-panel__note';
    empty.textContent = 'No niche assigned yet. Pick a trending lane for bonus payouts.';
    panel.appendChild(empty);
  }

  if (!instance.nicheLocked && ensureArray(instance.nicheOptions).length) {
    const field = document.createElement('label');
    field.className = 'shopily-field';
    field.textContent = 'Assign niche';

    const select = document.createElement('select');
    select.className = 'shopily-select';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choose a niche';
    select.appendChild(placeholder);

    instance.nicheOptions.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.id;
      optionEl.textContent = `${option.name} — ${formatPercent(option.multiplier - 1)} boost`;
      select.appendChild(optionEl);
    });

    select.value = instance.niche?.id || '';
    select.addEventListener('change', event => {
      onSelectNiche(instance.id, event.target.value || null);
    });

    field.appendChild(select);
    panel.appendChild(field);
  } else if (instance.nicheLocked && instance.niche) {
    const locked = document.createElement('p');
    locked.className = 'shopily-panel__hint';
    locked.textContent = 'Niche locked in — upgrades can refresh trend strength.';
    panel.appendChild(locked);
  }

  return panel;
}

function renderStatsPanel(instance, formatters = {}) {
  const { formatCurrency = value => String(value ?? ''), formatSignedCurrency = value => String(value ?? ''), formatPercent = value => String(value ?? '') } = formatters;

  const panel = document.createElement('section');
  panel.className = 'shopily-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Store health';
  panel.appendChild(heading);

  const list = document.createElement('dl');
  list.className = 'shopily-stats';
  const entries = [
    { label: 'Latest payout', value: formatCurrency(instance.latestPayout || 0) },
    { label: 'Average / day', value: formatCurrency(instance.averagePayout || 0) },
    { label: 'Lifetime sales', value: formatCurrency(instance.lifetimeIncome || 0) },
    { label: 'Lifetime spend', value: formatCurrency(instance.lifetimeSpend || 0) },
    { label: 'Profit to date', value: formatSignedCurrency(instance.profit || 0) },
    { label: 'Lifetime ROI', value: formatPercent(instance.roi) },
    { label: 'Resale value', value: formatCurrency(instance.resaleValue || 0) }
  ];

  entries.forEach(entry => {
    const row = document.createElement('div');
    row.className = 'shopily-stats__row';
    const term = document.createElement('dt');
    term.textContent = entry.label;
    const value = document.createElement('dd');
    value.textContent = entry.value;
    row.append(term, value);
    list.appendChild(row);
  });

  panel.appendChild(list);

  if (!instance.maintenanceFunded) {
    const warning = document.createElement('p');
    warning.className = 'shopily-panel__warning';
    warning.textContent = 'Maintenance unfunded — cover daily upkeep to avoid shutdowns.';
    panel.appendChild(warning);
  }

  if (ensureArray(instance.maintenance?.parts).length) {
    const upkeep = document.createElement('p');
    upkeep.className = 'shopily-panel__note';
    upkeep.textContent = `Daily upkeep: ${instance.maintenance.parts.join(' • ')}`;
    panel.appendChild(upkeep);
  }

  return panel;
}

function renderPayoutBreakdown(instance, formatters = {}) {
  const { formatCurrency = value => String(value ?? ''), formatPercent = value => String(value ?? '') } = formatters;

  const panel = document.createElement('section');
  panel.className = 'shopily-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Payout recap';
  panel.appendChild(heading);

  const entries = ensureArray(instance.payoutBreakdown?.entries);
  if (!entries.length) {
    const note = document.createElement('p');
    note.className = 'shopily-panel__note';
    note.textContent = 'No payout modifiers yet. Unlock upgrades and courses to stack multipliers.';
    panel.appendChild(note);
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
      const percent = entry.percent !== null && entry.percent !== undefined ? ` (${formatPercent(entry.percent)})` : '';
      value.textContent = `${amount}${percent}`;
      item.append(label, value);
      list.appendChild(item);
    });
    panel.appendChild(list);
  }

  const total = document.createElement('p');
  total.className = 'shopily-panel__note';
  total.textContent = `Yesterday’s total: ${formatCurrency(instance.payoutBreakdown?.total || 0)}`;
  panel.appendChild(total);

  return panel;
}

function renderActionList(instance, dependencies = {}) {
  const { formatHours = value => String(value ?? ''), formatCurrency = value => String(value ?? ''), onRunAction = () => {} } = dependencies;

  const panel = document.createElement('section');
  panel.className = 'shopily-panel';

  const heading = document.createElement('h3');
  heading.textContent = 'Quality actions';
  panel.appendChild(heading);

  const actions = ensureArray(instance.actions);
  if (!actions.length) {
    const empty = document.createElement('p');
    empty.className = 'shopily-panel__note';
    empty.textContent = 'No actions unlocked yet. Install upgrades to expand your playbook.';
    panel.appendChild(empty);
    return panel;
  }

  const list = document.createElement('ul');
  list.className = 'shopily-action-list';

  actions.forEach(action => {
    const item = document.createElement('li');
    item.className = 'shopily-action';

    const label = document.createElement('div');
    label.className = 'shopily-action__label';
    label.textContent = action.label;

    const meta = document.createElement('div');
    meta.className = 'shopily-action__meta';
    const time = action.time > 0 ? formatHours(action.time) : 'Instant';
    const cost = action.cost > 0 ? formatCurrency(action.cost) : 'No spend';
    meta.textContent = `${time} • ${cost}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shopily-button shopily-button--secondary';
    button.textContent = action.available ? 'Run now' : 'Locked';
    button.disabled = !action.available;
    if (action.disabledReason) {
      button.title = action.disabledReason;
    }
    button.addEventListener('click', () => {
      if (button.disabled) return;
      onRunAction(instance.id, action.id);
    });

    item.append(label, meta, button);
    list.appendChild(item);
  });

  panel.appendChild(list);
  return panel;
}

export default function createStoreDetail(instance, dependencies = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    formatSignedCurrency = value => String(value ?? ''),
    formatPercent = value => String(value ?? ''),
    formatHours = value => String(value ?? ''),
    onRunAction = () => {},
    onSelectNiche = () => {}
  } = dependencies;

  const detail = document.createElement('aside');
  detail.className = 'shopily-detail';

  if (!instance) {
    const empty = document.createElement('div');
    empty.className = 'shopily-detail__empty';
    empty.textContent = 'Select a store to inspect payouts, niches, and upgrades.';
    detail.appendChild(empty);
    return detail;
  }

  const header = document.createElement('header');
  header.className = 'shopily-detail__header';
  const title = document.createElement('h2');
  title.textContent = instance.label;
  const status = document.createElement('span');
  status.className = 'shopily-status';
  status.dataset.state = instance.status?.id || 'setup';
  status.textContent = instance.status?.label || 'Setup';
  header.append(title, status);
  detail.appendChild(header);

  if (instance.pendingIncome > 0) {
    const pending = document.createElement('p');
    pending.className = 'shopily-panel__hint';
    pending.textContent = `Pending payouts: ${formatCurrency(instance.pendingIncome)} once upkeep clears.`;
    detail.appendChild(pending);
  }

  const formatters = { formatCurrency, formatSignedCurrency, formatPercent };
  const actionDependencies = { formatHours, formatCurrency, onRunAction };
  const nicheDependencies = { formatPercent, onSelectNiche };

  detail.append(
    renderStatsPanel(instance, formatters),
    renderQualityPanel(instance, formatters),
    renderNichePanel(instance, nicheDependencies),
    renderPayoutBreakdown(instance, formatters),
    renderActionList(instance, actionDependencies)
  );

  return detail;
}
