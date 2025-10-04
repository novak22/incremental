import { ensureArray } from '../../../../../../../core/helpers.js';

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
  const {
    formatCurrency = value => String(value ?? ''),
    formatHours = value => String(value ?? ''),
    onQuickAction
  } = helpers;

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

export {
  TABLE_THEME,
  mapInstanceTable,
  mapTableColumns,
  mapTableRows,
  renderActionCell,
  renderNameCell,
  renderNicheBadge,
  renderQualityCell
};

export default {
  TABLE_THEME,
  mapInstanceTable,
  mapTableColumns,
  mapTableRows,
  renderActionCell,
  renderNameCell,
  renderNicheBadge,
  renderQualityCell
};
