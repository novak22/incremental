function renderRenameForm(video, { onRename }) {
  const form = document.createElement('form');
  form.className = 'videotube-rename';
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = form.querySelector('input');
    onRename?.(video.id, input.value);
  });

  const label = document.createElement('label');
  label.textContent = 'Video title';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 60;
  input.className = 'videotube-input';
  input.placeholder = video.fallbackLabel;
  input.value = video.customName || '';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'videotube-button videotube-button--secondary';
  submit.textContent = 'Save title';

  form.append(label, input, submit);
  return form;
}

function renderNicheBadge(video) {
  const badge = document.createElement('span');
  badge.className = 'videotube-niche';
  if (video.niche) {
    badge.textContent = video.niche.name;
    badge.dataset.tone = video.niche.label?.toLowerCase() || 'steady';
    if (video.niche.label) {
      badge.title = `${video.niche.label} • ${video.niche.summary}`;
    }
  } else {
    badge.textContent = 'No niche yet';
    badge.dataset.tone = 'idle';
  }
  return badge;
}

function renderNicheSection(video, { onNicheSelect }) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';
  const title = document.createElement('h3');
  title.textContent = 'Niche focus';
  panel.appendChild(title);

  if (video.nicheLocked && video.niche) {
    const badge = renderNicheBadge(video);
    badge.classList.add('videotube-niche--large');
    panel.appendChild(badge);
    const summary = document.createElement('p');
    summary.className = 'videotube-panel__note';
    summary.textContent = `${video.niche.label || 'Steady'} demand • ${video.niche.summary}`;
    panel.appendChild(summary);
  } else {
    const description = document.createElement('p');
    description.className = 'videotube-panel__note';
    description.textContent = 'Lock a niche once to boost payouts. Choose wisely — it sticks after launch!';
    panel.appendChild(description);

    const field = document.createElement('label');
    field.className = 'videotube-field';
    field.textContent = 'Select niche';
    const select = document.createElement('select');
    select.className = 'videotube-select';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Pick a niche';
    select.appendChild(emptyOption);
    (video.nicheOptions || []).forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = `${option.name} • ${option.label || ''}`.trim();
      opt.title = option.summary || '';
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      if (!select.value) return;
      onNicheSelect?.(video.id, select.value);
    });
    field.appendChild(select);
    panel.appendChild(field);
  }

  return panel;
}

function renderVideoStats(video, { formatCurrency }) {
  const stats = document.createElement('dl');
  stats.className = 'videotube-stats-grid';

  const entries = [
    { label: 'Latest payout', value: formatCurrency(video.latestPayout) },
    { label: 'Daily average', value: formatCurrency(video.averagePayout) },
    { label: 'Lifetime earned', value: formatCurrency(video.lifetimeIncome) },
    {
      label: 'ROI',
      value:
        typeof video.roi === 'number'
          ? `${video.roi >= 0 ? '+' : ''}${Math.round(video.roi * 100)}%`
          : 'N/A'
    }
  ];

  entries.forEach(entry => {
    const dt = document.createElement('dt');
    dt.textContent = entry.label;
    const dd = document.createElement('dd');
    dd.textContent = entry.value;
    stats.append(dt, dd);
  });

  return stats;
}

function renderQualityPanel(video, { formatHours }) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';
  const title = document.createElement('h3');
  title.textContent = 'Quality momentum';
  panel.appendChild(title);

  const level = document.createElement('p');
  level.className = 'videotube-panel__lead';
  level.textContent = `Quality ${video.qualityLevel} • ${video.qualityInfo?.name || 'Growing audience'}`;
  panel.appendChild(level);

  const progress = document.createElement('div');
  progress.className = 'videotube-progress';
  const progressFill = document.createElement('div');
  progressFill.className = 'videotube-progress__fill';
  progressFill.style.setProperty('--videotube-progress', String((video.milestone?.percent || 0) * 100));
  progress.appendChild(progressFill);
  panel.appendChild(progress);

  if (video.milestone?.summary) {
    const summary = document.createElement('p');
    summary.className = 'videotube-panel__note';
    summary.textContent = `${video.milestone.summary} • next: ${video.milestone?.nextLevel?.name || 'Maxed out'}`;
    panel.appendChild(summary);
  }

  if (video.milestone?.steps?.length) {
    const list = document.createElement('ul');
    list.className = 'videotube-list';
    video.milestone.steps.forEach(step => {
      const item = document.createElement('li');
      item.textContent = `${step.current}/${step.goal} ${step.label}`;
      list.appendChild(item);
    });
    panel.appendChild(list);
  }

  return panel;
}

function renderPayoutPanel(video, { formatCurrency }) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';
  const title = document.createElement('h3');
  title.textContent = 'Latest payout breakdown';
  panel.appendChild(title);

  if (!video.payoutBreakdown?.entries?.length) {
    const empty = document.createElement('p');
    empty.className = 'videotube-panel__note';
    empty.textContent = 'No payout history yet — run a day to gather data.';
    panel.appendChild(empty);
    return panel;
  }

  const total = document.createElement('p');
  total.className = 'videotube-panel__lead';
  total.textContent = `Total ${formatCurrency(video.payoutBreakdown.total)}`;
  panel.appendChild(total);

  const list = document.createElement('ul');
  list.className = 'videotube-list videotube-list--payout';
  video.payoutBreakdown.entries.forEach(entry => {
    const item = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = entry.label;
    const value = document.createElement('span');
    value.textContent = `${entry.percent ? `${Math.round(entry.percent * 100)}% • ` : ''}${formatCurrency(entry.amount)}`;
    item.append(label, value);
    list.appendChild(item);
  });
  panel.appendChild(list);

  return panel;
}

function renderActionsPanel(video, { formatCurrency, formatHours, onQuickAction }) {
  const panel = document.createElement('section');
  panel.className = 'videotube-panel';
  const title = document.createElement('h3');
  title.textContent = 'Quality actions';
  panel.appendChild(title);

  if (!Array.isArray(video.actions) || !video.actions.length) {
    const empty = document.createElement('p');
    empty.className = 'videotube-panel__note';
    empty.textContent = 'No actions unlocked yet. Discover upgrades to expand your toolkit.';
    panel.appendChild(empty);
    return panel;
  }

  const list = document.createElement('ul');
  list.className = 'videotube-action-list';

  video.actions.forEach(action => {
    const item = document.createElement('li');
    item.className = 'videotube-action';

    const label = document.createElement('div');
    label.className = 'videotube-action__label';
    label.textContent = action.label;

    const meta = document.createElement('div');
    meta.className = 'videotube-action__meta';
    const costParts = [
      action.time > 0 ? `${formatHours(action.time)}` : 'Instant',
      action.cost > 0 ? formatCurrency(action.cost) : 'Free'
    ];
    meta.textContent = `${action.effect} • ${costParts.join(' • ')}`;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'videotube-button videotube-button--primary';
    button.textContent = 'Run action';
    button.disabled = !action.available;
    button.title = action.available ? '' : action.disabledReason || 'Unavailable';
    button.addEventListener('click', () => {
      if (button.disabled) return;
      onQuickAction?.(video.id, action.id);
    });

    item.append(label, meta, button);
    list.appendChild(item);
  });

  panel.appendChild(list);
  return panel;
}

export function createDetailView(options = {}) {
  const { formatCurrency, formatHours, onQuickAction, onRename, onNicheSelect } = options;

  return function renderDetailView({ model = {}, state = {} } = {}) {
    const container = document.createElement('section');
    container.className = 'videotube-view videotube-view--detail';

    const instances = Array.isArray(model.instances) ? model.instances : [];
    const video = instances.find(entry => entry.id === state.selectedVideoId);
    if (!video) {
      const empty = document.createElement('p');
      empty.className = 'videotube-empty';
      empty.textContent = 'Select a video from the dashboard to inspect analytics.';
      container.appendChild(empty);
      return container;
    }

    const header = document.createElement('div');
    header.className = 'videotube-detail__header';
    const title = document.createElement('h2');
    title.textContent = video.label;
    header.appendChild(title);
    header.appendChild(renderRenameForm(video, { onRename }));
    container.appendChild(header);

    container.appendChild(renderVideoStats(video, { formatCurrency }));

    const grid = document.createElement('div');
    grid.className = 'videotube-detail-grid';
    grid.append(
      renderQualityPanel(video, { formatHours }),
      renderPayoutPanel(video, { formatCurrency }),
      renderActionsPanel(video, { formatCurrency, formatHours, onQuickAction }),
      renderNicheSection(video, { onNicheSelect })
    );
    container.appendChild(grid);

    return container;
  };
}

export default {
  createDetailView
};
