import createStatusBadge from './statusBadge.js';

function createSection(titleText) {
  const section = document.createElement('section');
  section.className = 'digishelf-panel';
  const header = document.createElement('header');
  header.className = 'digishelf-panel__header';
  const title = document.createElement('h3');
  title.textContent = titleText;
  header.appendChild(title);
  section.appendChild(header);
  return section;
}

function renderNichePanel(instance, assetId, dependencies = {}) {
  const { onSelectNiche = () => {} } = dependencies;
  const panel = createSection('Audience Niche');
  const content = document.createElement('div');
  content.className = 'digishelf-panel__body';

  if (instance.niche) {
    const badge = document.createElement('div');
    badge.className = 'digishelf-niche';
    const name = document.createElement('strong');
    name.textContent = instance.niche.name;
    const note = document.createElement('span');
    note.textContent = instance.niche.summary || 'Steady interest today';
    badge.append(name, note);
    content.appendChild(badge);
  }

  if (!instance.nicheLocked && Array.isArray(instance.nicheOptions) && instance.nicheOptions.length) {
    const field = document.createElement('label');
    field.className = 'digishelf-field';
    field.textContent = 'Assign a niche';
    const select = document.createElement('select');
    select.className = 'digishelf-select';
    select.innerHTML = '<option value="">Choose a niche</option>';
    instance.nicheOptions.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = `${option.name} (${option.label || 'steady'})`;
      select.appendChild(opt);
    });
    select.addEventListener('change', event => {
      const { value } = event.target;
      if (value) {
        onSelectNiche(assetId, instance.id, value);
      }
    });
    content.appendChild(field);
    content.appendChild(select);
  } else if (!instance.niche) {
    const hint = document.createElement('p');
    hint.className = 'digishelf-panel__hint';
    hint.textContent = 'Niches unlock after launch wraps. Check back tomorrow!';
    content.appendChild(hint);
  } else {
    const locked = document.createElement('p');
    locked.className = 'digishelf-panel__hint';
    locked.textContent = 'Niche locked in — ride the trend and stack modifiers.';
    content.appendChild(locked);
  }

  panel.appendChild(content);
  return panel;
}

function renderQualityPanel(instance) {
  const panel = createSection('Quality Ladder');
  const content = document.createElement('div');
  content.className = 'digishelf-panel__body';

  const header = document.createElement('div');
  header.className = 'digishelf-quality';
  const level = document.createElement('strong');
  level.textContent = `Quality ${instance.milestone?.level ?? 0}`;
  const note = document.createElement('span');
  note.textContent = instance.qualityInfo?.name || 'Milestone in progress';
  header.append(level, note);

  const progress = document.createElement('div');
  progress.className = 'digishelf-progress';
  const fill = document.createElement('div');
  fill.className = 'digishelf-progress__fill';
  fill.style.setProperty('--digishelf-progress', `${Math.round((instance.milestone?.percent ?? 0) * 100)}%`);
  progress.appendChild(fill);

  const summary = document.createElement('p');
  summary.className = 'digishelf-panel__hint';
  summary.textContent = instance.milestone?.summary || 'Complete milestone actions to unlock bigger payouts.';

  content.append(header, progress, summary);

  panel.appendChild(content);
  return panel;
}

function renderPayoutPanel(instance, formatCurrency) {
  const panel = createSection('Payout Recap');
  const content = document.createElement('div');
  content.className = 'digishelf-panel__body';

  if (instance.payoutBreakdown?.entries?.length) {
    const list = document.createElement('ul');
    list.className = 'digishelf-list';
    instance.payoutBreakdown.entries.forEach(entry => {
      const item = document.createElement('li');
      item.className = 'digishelf-list__item';
      const label = document.createElement('span');
      label.className = 'digishelf-list__label';
      label.textContent = entry.label;
      const value = document.createElement('span');
      value.className = 'digishelf-list__value';
      value.textContent = entry.percent !== null && entry.percent !== undefined
        ? `${Math.round(entry.percent * 100)}%`
        : formatCurrency(entry.amount);
      item.append(label, value);
      list.appendChild(item);
    });
    const total = document.createElement('div');
    total.className = 'digishelf-panel__total';
    total.textContent = `Today: ${formatCurrency(instance.payoutBreakdown.total)}`;
    content.append(list, total);
  } else {
    const empty = document.createElement('p');
    empty.className = 'digishelf-panel__hint';
    empty.textContent = 'Complete launch and upkeep to start logging daily royalties.';
    content.appendChild(empty);
  }

  panel.appendChild(content);
  return panel;
}

function renderRoiPanel(instance, formatCurrency) {
  const panel = createSection('Lifetime ROI');
  const content = document.createElement('div');
  content.className = 'digishelf-panel__body digishelf-panel__body--grid';

  const spend = document.createElement('div');
  spend.className = 'digishelf-stat';
  spend.innerHTML = `<span class="digishelf-stat__label">Invested</span><strong class="digishelf-stat__value">${formatCurrency(instance.estimatedSpend)}</strong>`;

  const earned = document.createElement('div');
  earned.className = 'digishelf-stat';
  earned.innerHTML = `<span class="digishelf-stat__label">Earned</span><strong class="digishelf-stat__value">${formatCurrency(instance.lifetimeIncome)}</strong>`;

  const roi = document.createElement('div');
  roi.className = 'digishelf-stat';
  const roiValue = Number.isFinite(instance.roi) ? `${Math.round(instance.roi * 100)}%` : '—';
  roi.innerHTML = `<span class="digishelf-stat__label">Return</span><strong class="digishelf-stat__value">${roiValue}</strong>`;

  content.append(spend, earned, roi);
  panel.appendChild(content);
  return panel;
}

function renderActionPanel(instance, assetId, dependencies = {}) {
  const {
    formatHours = value => String(value ?? ''),
    formatMoney = value => String(value ?? ''),
    onRunAction = () => {}
  } = dependencies;

  const panel = createSection('Action Queue');
  const content = document.createElement('div');
  content.className = 'digishelf-panel__body';

  if (!instance.actions || !instance.actions.length) {
    const empty = document.createElement('p');
    empty.className = 'digishelf-panel__hint';
    empty.textContent = 'No quality actions unlocked yet.';
    content.appendChild(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'digishelf-action-list';
    instance.actions.forEach(action => {
      const item = document.createElement('li');
      item.className = 'digishelf-action';
      const label = document.createElement('div');
      label.className = 'digishelf-action__label';
      label.textContent = action.label;
      const meta = document.createElement('div');
      meta.className = 'digishelf-action__meta';
      const parts = [];
      if (action.time > 0) parts.push(formatHours(action.time));
      if (action.cost > 0) parts.push(`$${formatMoney(action.cost)}`);
      meta.textContent = parts.join(' • ') || 'No cost';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'digishelf-button digishelf-button--ghost';
      button.textContent = action.available ? 'Run Action' : 'Locked';
      button.disabled = !action.available;
      if (action.disabledReason) {
        button.title = action.disabledReason;
      }
      button.addEventListener('click', () => {
        if (button.disabled) return;
        onRunAction(assetId, instance.id, action.id);
      });
      item.append(label, meta, button);
      list.appendChild(item);
    });
    content.appendChild(list);
  }

  panel.appendChild(content);
  return panel;
}

export default function renderDetailPane(options = {}) {
  const {
    instance = null,
    assetId = 'ebook',
    formatters = {},
    onSelectNiche = () => {},
    onRunAction = () => {}
  } = options;

  const detail = document.createElement('aside');
  detail.className = 'digishelf-detail';

  if (!instance) {
    const empty = document.createElement('p');
    empty.className = 'digishelf-panel__hint';
    empty.textContent = 'Select a resource to review milestones, modifiers, and ROI.';
    detail.appendChild(empty);
    return detail;
  }

  const header = document.createElement('header');
  header.className = 'digishelf-detail__header';
  const name = document.createElement('h2');
  name.textContent = instance.label;
  const status = createStatusBadge(instance);
  const payout = document.createElement('p');
  payout.className = 'digishelf-detail__payout';
  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  payout.textContent = `Today ${formatCurrency(instance.latestPayout)} • Range ${formatCurrency(instance.qualityRange?.min ?? 0)} – ${formatCurrency(instance.qualityRange?.max ?? 0)}`;
  header.append(name, status, payout);

  detail.append(
    header,
    renderNichePanel(instance, assetId, { onSelectNiche }),
    renderQualityPanel(instance),
    renderPayoutPanel(instance, formatCurrency),
    renderRoiPanel(instance, formatCurrency),
    renderActionPanel(instance, assetId, {
      formatHours: formatters.formatHours,
      formatMoney: formatters.formatMoney,
      onRunAction
    })
  );

  return detail;
}
