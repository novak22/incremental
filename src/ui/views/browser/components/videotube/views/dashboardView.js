import { renderKpiGrid } from '../../common/renderKpiGrid.js';
import { renderInstanceTable } from '../../common/renderInstanceTable.js';

const KPI_THEME = {
  container: 'asset-kpis videotube-stats',
  grid: 'asset-kpis__grid',
  card: 'asset-kpi videotube-stats__card',
  label: 'asset-kpi__label',
  value: 'asset-kpi__value',
  note: 'asset-kpi__note',
  empty: 'asset-kpis__empty'
};

const TABLE_THEME = {
  container: 'asset-table videotube-table-wrapper',
  table: 'asset-table__table videotube-table',
  headCell: 'asset-table__heading',
  row: 'asset-table__row',
  cell: 'asset-table__cell',
  actionsCell: 'asset-table__cell--actions videotube-table__cell--actions',
  actions: 'asset-table__actions',
  actionButton: 'videotube-button videotube-button--ghost',
  empty: 'asset-table__empty videotube-table__empty'
};

const TABLE_COLUMNS = [
  { id: 'name', label: 'Video', cellClassName: 'videotube-table__cell--label', renderer: 'name' },
  { id: 'latest', label: 'Latest payout', renderer: 'latest' },
  { id: 'lifetime', label: 'Lifetime', renderer: 'lifetime' },
  { id: 'quality', label: 'Quality', renderer: 'quality' },
  { id: 'niche', label: 'Niche', renderer: 'niche' },
  { id: 'quickAction', label: 'Quick action', renderer: 'quickAction' }
];

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

function createMetricItems(stats = {}, formatters = {}) {
  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const formatPercent = formatters.formatPercent || (value => String(value ?? ''));
  return [
    { id: 'lifetime', label: 'Total earned', value: formatCurrency(stats.lifetime || 0) },
    { id: 'daily', label: 'Daily payout', value: formatCurrency(stats.daily || 0) },
    { id: 'active', label: 'Active uploads', value: stats.active || 0 },
    { id: 'milestone', label: 'Milestone progress', value: formatPercent(stats.milestonePercent || 0) }
  ];
}

const CELL_RENDERERS = {
  name(video) {
    const fragment = document.createDocumentFragment();
    const name = document.createElement('strong');
    name.textContent = video.label;
    fragment.appendChild(name);
    if (video.status?.label) {
      const status = document.createElement('span');
      status.className = 'videotube-status';
      status.textContent = video.status.label;
      fragment.appendChild(status);
    }
    return fragment;
  },
  latest(video, context) {
    return (context.formatCurrency || (value => String(value ?? '')))(video.latestPayout || 0);
  },
  lifetime(video, context) {
    return (context.formatCurrency || (value => String(value ?? '')))(video.lifetimeIncome || 0);
  },
  quality(video) {
    return renderQualityCell(video);
  },
  niche(video) {
    return renderNicheBadge(video);
  },
  quickAction(video, context) {
    if (!video.quickAction) {
      return 'No actions';
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'videotube-button videotube-button--ghost';
    button.textContent = video.quickAction.label;
    button.disabled = !video.quickAction.available;
    button.title = video.quickAction.available
      ? `${video.quickAction.effect} • ${(context.formatHours || (value => String(value ?? '')))(video.quickAction.time)} • ${(context.formatCurrency || (value => String(value ?? '')))(video.quickAction.cost)}`
      : video.quickAction.disabledReason || 'Locked';
    button.addEventListener('click', event => {
      event.stopPropagation();
      if (button.disabled) return;
      context.onQuickAction?.(video.id, video.quickAction.id);
    });
    return button;
  }
};

function mapVideoRows(instances = [], state = {}, dependencies = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    formatHours = value => String(value ?? ''),
    onQuickAction = () => {}
  } = dependencies;

  return (Array.isArray(instances) ? instances : [])
    .filter(Boolean)
    .map(video => {
      const cells = TABLE_COLUMNS.map(column => {
        const renderer = CELL_RENDERERS[column.renderer] || CELL_RENDERERS[column.id];
        const content = renderer
          ? renderer(video, { formatCurrency, formatHours, onQuickAction })
          : video[column.id];
        return {
          className: column.cellClassName,
          content: content ?? ''
        };
      });
      return {
        id: video.id,
        isSelected: video.id === state.selectedVideoId,
        cells
      };
    });
}

export function createDashboardView(options = {}) {
  const {
    formatCurrency = value => String(value ?? ''),
    formatPercent = value => String(value ?? ''),
    formatHours = value => String(value ?? ''),
    onQuickAction,
    onSelectVideo
  } = options;

  return function renderDashboardView({ model = {}, state = {} } = {}) {
    const container = document.createElement('section');
    container.className = 'videotube-view videotube-view--dashboard';

    container.appendChild(
      renderKpiGrid({
        items: createMetricItems(model.stats, { formatCurrency, formatPercent }),
        theme: KPI_THEME
      })
    );

    const rows = mapVideoRows(model.instances, state, {
      formatCurrency,
      formatHours,
      onQuickAction,
      onSelectVideo
    });

    container.appendChild(
      renderInstanceTable({
        theme: TABLE_THEME,
        columns: TABLE_COLUMNS.map(column => ({
          id: column.id,
          label: column.label,
          className: 'asset-table__heading'
        })),
        rows,
        selectedId: state.selectedVideoId,
        onSelect: id => onSelectVideo?.(id),
        emptyState: {
          message: 'No videos yet. Launch your first upload to start cashing in.'
        }
      })
    );

    return container;
  };
}

export default {
  createDashboardView
};
