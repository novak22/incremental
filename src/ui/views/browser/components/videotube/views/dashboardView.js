function renderStatsBar(stats = {}, { formatCurrency, formatPercent }) {
  const bar = document.createElement('div');
  bar.className = 'videotube-stats';

  const lifetime = document.createElement('article');
  lifetime.className = 'videotube-stats__card';
  lifetime.innerHTML = `<span>Total earned</span><strong>${formatCurrency(stats.lifetime)}</strong>`;

  const daily = document.createElement('article');
  daily.className = 'videotube-stats__card';
  daily.innerHTML = `<span>Daily payout</span><strong>${formatCurrency(stats.daily)}</strong>`;

  const active = document.createElement('article');
  active.className = 'videotube-stats__card';
  active.innerHTML = `<span>Active uploads</span><strong>${stats.active || 0}</strong>`;

  const momentum = document.createElement('article');
  momentum.className = 'videotube-stats__card';
  momentum.innerHTML = `<span>Milestone progress</span><strong>${formatPercent(stats.milestonePercent)}</strong>`;

  bar.append(lifetime, daily, active, momentum);
  return bar;
}

function renderQualityCell(video) {
  const wrapper = document.createElement('div');
  wrapper.className = 'videotube-quality';

  const level = document.createElement('span');
  level.className = 'videotube-quality__level';
  level.textContent = `Q${video.qualityLevel}`;

  const bar = document.createElement('div');
  bar.className = 'videotube-quality__bar';
  const fill = document.createElement('div');
  fill.className = 'videotube-quality__fill';
  fill.style.setProperty('--videotube-quality', String((video.milestone?.percent || 0) * 100));
  bar.appendChild(fill);

  const summary = document.createElement('span');
  summary.className = 'videotube-quality__summary';
  summary.textContent = video.milestone?.summary || 'No milestone data yet';

  wrapper.append(level, bar, summary);
  return wrapper;
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

function renderDashboardTable(instances = [], state = {}, helpers = {}) {
  const { formatCurrency, formatHours, onQuickAction, onSelectVideo } = helpers;
  const selectedId = state.selectedVideoId;

  const table = document.createElement('table');
  table.className = 'videotube-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Video', 'Latest payout', 'Lifetime', 'Quality', 'Niche', 'Quick action'].forEach(label => {
    const th = document.createElement('th');
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  instances.forEach(video => {
    const row = document.createElement('tr');
    row.dataset.videoId = video.id;
    if (video.id === selectedId) {
      row.classList.add('is-selected');
    }

    row.addEventListener('click', () => {
      onSelectVideo?.(video.id);
    });

    const nameCell = document.createElement('td');
    nameCell.className = 'videotube-table__cell--label';
    const name = document.createElement('strong');
    name.textContent = video.label;
    const status = document.createElement('span');
    status.className = 'videotube-status';
    status.textContent = video.status?.label || '';
    nameCell.append(name, status);

    const latestCell = document.createElement('td');
    latestCell.textContent = formatCurrency(video.latestPayout);

    const lifetimeCell = document.createElement('td');
    lifetimeCell.textContent = formatCurrency(video.lifetimeIncome);

    const qualityCell = document.createElement('td');
    qualityCell.appendChild(renderQualityCell(video));

    const nicheCell = document.createElement('td');
    nicheCell.appendChild(renderNicheBadge(video));

    const actionCell = document.createElement('td');
    actionCell.className = 'videotube-table__cell--actions';
    if (video.quickAction) {
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      actionButton.className = 'videotube-button videotube-button--ghost';
      actionButton.textContent = video.quickAction.label;
      actionButton.disabled = !video.quickAction.available;
      actionButton.title = video.quickAction.available
        ? `${video.quickAction.effect} • ${formatHours(video.quickAction.time)} • ${formatCurrency(video.quickAction.cost)}`
        : video.quickAction.disabledReason || 'Locked';
      actionButton.addEventListener('click', event => {
        event.stopPropagation();
        if (actionButton.disabled) return;
        onQuickAction?.(video.id, video.quickAction.id);
      });
      actionCell.appendChild(actionButton);
    } else {
      actionCell.textContent = 'No actions';
    }

    row.append(nameCell, latestCell, lifetimeCell, qualityCell, nicheCell, actionCell);
    tbody.appendChild(row);
  });

  if (!tbody.children.length) {
    const emptyRow = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'videotube-table__empty';
    cell.textContent = 'No videos yet. Launch your first upload to start cashing in.';
    emptyRow.appendChild(cell);
    tbody.appendChild(emptyRow);
  }

  table.appendChild(tbody);
  return table;
}

export function createDashboardView(options = {}) {
  const {
    formatCurrency,
    formatPercent,
    formatHours,
    onQuickAction,
    onSelectVideo
  } = options;

  return function renderDashboardView({ model = {}, state = {} } = {}) {
    const container = document.createElement('section');
    container.className = 'videotube-view videotube-view--dashboard';

    container.appendChild(renderStatsBar(model.stats || {}, { formatCurrency, formatPercent }));

    const instances = Array.isArray(model.instances) ? model.instances : [];
    container.appendChild(
      renderDashboardTable(instances, state, {
        formatCurrency,
        formatHours,
        onQuickAction,
        onSelectVideo
      })
    );

    return container;
  };
}

export default {
  createDashboardView
};
