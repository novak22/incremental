import { ensureArray } from '../../../../../../core/helpers.js';

const KPI_THEME = {
  container: 'videotube-stats',
  grid: 'videotube-stats__grid',
  card: 'videotube-stats__card',
  label: 'videotube-stats__label',
  value: 'videotube-stats__value',
  note: 'videotube-stats__note',
  empty: 'videotube-stats__empty'
};

const TABLE_COLUMNS = [
  { id: 'name', label: 'Video', cellClassName: 'videotube-table__cell--label', renderer: 'name' },
  { id: 'latest', label: 'Latest payout', renderer: 'latest' },
  { id: 'lifetime', label: 'Lifetime', renderer: 'lifetime' },
  { id: 'quality', label: 'Quality', renderer: 'quality' },
  { id: 'niche', label: 'Niche', renderer: 'niche' },
  { id: 'action', label: 'Quick action', cellClassName: 'videotube-table__cell--actions', renderer: 'action' }
];

const TABLE_THEME = {
  container: 'videotube-table-container',
  table: 'videotube-table',
  headCell: 'videotube-table__heading',
  row: 'videotube-table__row',
  cell: 'videotube-table__cell',
  actionsCell: 'videotube-table__cell--actions',
  actions: 'videotube-table__actions',
  actionButton: 'videotube-button videotube-button--ghost',
  empty: 'videotube-table__empty'
};

const DETAIL_THEME = {
  container: 'videotube-detail',
  header: 'videotube-detail__header',
  title: 'videotube-detail__title',
  status: 'videotube-status',
  tabs: 'videotube-detail__tabs',
  stats: 'videotube-detail__stats',
  stat: 'videotube-detail__stat',
  statLabel: 'videotube-detail__stat-label',
  statValue: 'videotube-detail__stat-value',
  statNote: 'videotube-detail__stat-note',
  sections: 'videotube-detail__panels',
  section: 'videotube-panel',
  sectionTitle: 'videotube-panel__title',
  sectionBody: 'videotube-panel__body',
  actions: 'videotube-detail__actions',
  actionButton: 'videotube-button',
  empty: 'videotube-detail__empty'
};

function mapStatsItems(stats = {}, helpers = {}) {
  const formatCurrency = helpers.formatCurrency || (value => String(value ?? ''));
  const formatPercent = helpers.formatPercent || (value => String(value ?? ''));
  return [
    { id: 'lifetime', label: 'Total earned', value: formatCurrency(stats.lifetime || 0) },
    { id: 'daily', label: 'Daily payout', value: formatCurrency(stats.daily || 0) },
    { id: 'active', label: 'Active uploads', value: stats.active || 0 },
    { id: 'momentum', label: 'Milestone progress', value: formatPercent(stats.milestonePercent || 0) }
  ];
}

function renderNameCell(video) {
  const wrapper = document.createElement('div');
  wrapper.className = 'videotube-table__cell--label';
  const name = document.createElement('strong');
  name.textContent = video.label;
  const status = document.createElement('span');
  status.className = 'videotube-status';
  status.textContent = video.status?.label || '';
  wrapper.append(name, status);
  return wrapper;
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

function renderActionCell(video, helpers = {}) {
  const { formatCurrency = value => String(value ?? ''), formatHours = value => String(value ?? ''), onQuickAction } = helpers;
  if (!video.quickAction) {
    const empty = document.createElement('span');
    empty.className = 'videotube-table__action-empty';
    empty.textContent = 'No actions';
    return empty;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'videotube-button videotube-button--ghost';
  button.textContent = video.quickAction.label;
  button.disabled = !video.quickAction.available;
  button.title = video.quickAction.available
    ? `${video.quickAction.effect} • ${formatHours(video.quickAction.time)} • ${formatCurrency(video.quickAction.cost)}`
    : video.quickAction.disabledReason || 'Locked';
  button.addEventListener('click', event => {
    event.stopPropagation();
    if (button.disabled) return;
    onQuickAction?.(video.id, video.quickAction.id);
  });
  return button;
}

function mapTableColumns() {
  return TABLE_COLUMNS.map(column => ({
    id: column.id,
    label: column.label,
    className: 'videotube-table__heading'
  }));
}

function mapTableRows(instances, state, helpers = {}) {
  const formatCurrency = helpers.formatCurrency || (value => String(value ?? ''));
  const rows = [];
  const selectedId = state.selectedVideoId;
  ensureArray(instances).forEach(video => {
    const cells = [];
    TABLE_COLUMNS.forEach(column => {
      if (!column) return;
      const cell = { className: column.cellClassName };
      switch (column.renderer) {
        case 'name':
          cell.content = renderNameCell(video);
          break;
        case 'latest':
          cell.content = formatCurrency(video.latestPayout || 0);
          break;
        case 'lifetime':
          cell.content = formatCurrency(video.lifetimeIncome || 0);
          break;
        case 'quality':
          cell.content = renderQualityCell(video);
          break;
        case 'niche':
          cell.content = renderNicheBadge(video);
          break;
        case 'action':
          cell.content = renderActionCell(video, helpers);
          break;
        default:
          cell.content = video[column.id];
      }
      if (cell.content !== undefined) {
        cells.push(cell);
      }
    });
    rows.push({
      id: video.id,
      cells,
      isSelected: video.id === selectedId
    });
  });
  return rows;
}

function mapInstanceTable(instances, state, helpers = {}) {
  return {
    theme: TABLE_THEME,
    columns: mapTableColumns(),
    rows: mapTableRows(instances, state, helpers),
    selectedId: state.selectedVideoId,
    onSelect(id) {
      helpers.onSelectVideo?.(id);
    },
    emptyState: {
      message: 'No videos yet. Launch your first upload to start cashing in.'
    }
  };
}

function createQualitySection(video) {
  const fragment = document.createDocumentFragment();
  const lead = document.createElement('p');
  lead.className = 'videotube-panel__lead';
  lead.textContent = `Quality ${video.qualityLevel} • ${video.qualityInfo?.name || 'Growing audience'}`;
  const progress = document.createElement('div');
  progress.className = 'videotube-progress';
  const progressFill = document.createElement('div');
  progressFill.className = 'videotube-progress__fill';
  progressFill.style.setProperty('--videotube-progress', String((video.milestone?.percent || 0) * 100));
  progress.appendChild(progressFill);
  fragment.append(lead, progress);
  if (video.milestone?.summary) {
    const summary = document.createElement('p');
    summary.className = 'videotube-panel__note';
    summary.textContent = `${video.milestone.summary}`;
    fragment.appendChild(summary);
  }
  return fragment;
}

function createNicheSection(video) {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(renderNicheBadge(video));
  if (video.niche?.summary) {
    const note = document.createElement('p');
    note.className = 'videotube-panel__note';
    note.textContent = `${video.niche.label || 'Steady'} • ${video.niche.summary}`;
    fragment.appendChild(note);
  } else if (!video.niche) {
    const hint = document.createElement('p');
    hint.className = 'videotube-panel__note';
    hint.textContent = 'Assign a niche from the detail view to boost payouts.';
    fragment.appendChild(hint);
  }
  return fragment;
}

function createActionSection(video, helpers = {}) {
  const fragment = document.createDocumentFragment();
  if (!video.quickAction) {
    const note = document.createElement('p');
    note.className = 'videotube-panel__note';
    note.textContent = 'No quick actions available yet.';
    fragment.appendChild(note);
    return fragment;
  }
  const detail = document.createElement('p');
  detail.className = 'videotube-panel__note';
  const formatCurrency = helpers.formatCurrency || (value => String(value ?? ''));
  const formatHours = helpers.formatHours || (value => String(value ?? ''));
  detail.textContent = `${video.quickAction.effect} • ${formatHours(video.quickAction.time)} • ${formatCurrency(video.quickAction.cost)}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'videotube-button videotube-button--secondary';
  button.textContent = video.quickAction.label;
  button.disabled = !video.quickAction.available;
  if (video.quickAction.disabledReason) {
    button.title = video.quickAction.disabledReason;
  }
  button.addEventListener('click', () => {
    if (button.disabled) return;
    helpers.onQuickAction?.(video.id, video.quickAction.id);
  });
  fragment.append(detail, button);
  return fragment;
}

function mapDetailSections(video, helpers = {}) {
  const sections = [];
  sections.push({
    className: 'videotube-panel',
    title: 'Video stats',
    render: ({ article }) => {
      const stats = document.createElement('dl');
      stats.className = 'videotube-stats-grid';
      const formatCurrency = helpers.formatCurrency || (value => String(value ?? ''));
      const formatPercent = helpers.formatPercent || (value => String(value ?? ''));
      const entries = [
        { label: 'Latest payout', value: formatCurrency(video.latestPayout || 0) },
        { label: 'Daily average', value: formatCurrency(video.averagePayout || 0) },
        { label: 'Lifetime earned', value: formatCurrency(video.lifetimeIncome || 0) },
        { label: 'ROI', value: formatPercent(video.roi || 0) }
      ];
      entries.forEach(entry => {
        const dt = document.createElement('dt');
        dt.textContent = entry.label;
        const dd = document.createElement('dd');
        dd.textContent = entry.value;
        stats.append(dt, dd);
      });
      article.appendChild(stats);
    }
  });
  sections.push(
    {
      className: 'videotube-panel',
      title: 'Quality momentum',
      render: ({ article }) => {
        article.appendChild(createQualitySection(video));
      }
    },
    {
      className: 'videotube-panel',
      title: 'Niche focus',
      render: ({ article }) => {
        article.appendChild(createNicheSection(video));
      }
    },
    {
      className: 'videotube-panel',
      title: 'Quick action',
      render: ({ article }) => {
        article.appendChild(createActionSection(video, helpers));
      }
    }
  );
  return sections;
}

function mapDetailPanel(model, state, helpers = {}) {
  const instances = ensureArray(model.instances);
  const selected = instances.find(video => video.id === state.selectedVideoId);
  if (!selected) {
    return {
      theme: DETAIL_THEME,
      className: 'videotube-detail',
      isEmpty: true,
      emptyState: {
        message: 'Select a video to inspect payouts and momentum.'
      }
    };
  }
  return {
    theme: DETAIL_THEME,
    className: 'videotube-detail',
    header: {
      title: selected.label,
      status: {
        className: 'videotube-status',
        label: selected.status?.label || 'Active'
      }
    },
    sections: mapDetailSections(selected, helpers)
  };
}

export function createDashboardView(options = {}) {
  const {
    formatCurrency,
    formatPercent,
    formatHours,
    onQuickAction,
    onSelectVideo
  } = options;

  const helpers = {
    formatCurrency,
    formatPercent,
    formatHours,
    onQuickAction,
    onSelectVideo
  };

  return function renderDashboardView(viewContext = {}) {
    const {
      model = {},
      state = {},
      renderKpiGrid,
      renderInstanceTable,
      renderDetailPanel
    } = viewContext;

    const container = document.createElement('section');
    container.className = 'videotube-view videotube-view--dashboard';

    container.appendChild(renderKpiGrid({ items: mapStatsItems(model.stats || {}, helpers), theme: KPI_THEME }));

    const layout = document.createElement('div');
    layout.className = 'videotube-dashboard';
    const instances = ensureArray(model.instances);
    layout.append(
      renderInstanceTable(mapInstanceTable(instances, state, helpers)),
      renderDetailPanel(mapDetailPanel(model, state, helpers))
    );

    container.appendChild(layout);
    return container;
  };
}

export default {
  createDashboardView
};
