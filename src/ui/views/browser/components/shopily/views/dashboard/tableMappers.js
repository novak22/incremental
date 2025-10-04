import { ensureArray } from '../../../../../../../core/helpers.js';
import { formatNicheDelta } from './nicheFormatting.js';

const TABLE_COLUMNS = [
  { id: 'label', label: 'Store', cellClassName: 'shopily-table__cell--label', renderer: 'name' },
  { id: 'niche', label: 'Niche', renderer: 'niche' },
  { id: 'latestPayout', label: 'Daily Earnings', renderer: 'earnings' },
  { id: 'maintenanceCost', label: 'Upkeep', renderer: 'upkeep' },
  { id: 'roi', label: 'ROI', renderer: 'roi' },
  { id: 'actions', label: 'Actions', cellClassName: 'shopily-table__cell--actions', renderer: 'actions' }
];

const TABLE_THEME = {
  container: 'shopily-table-container',
  table: 'shopily-table',
  headCell: 'shopily-table__heading',
  row: 'shopily-table__row',
  cell: 'shopily-table__cell',
  actionsCell: 'shopily-table__cell--actions',
  actions: 'shopily-table__actions',
  actionButton: 'shopily-button shopily-button--ghost',
  empty: 'shopily-table__empty'
};

function renderNameCell(instance, handlers = {}) {
  const { onSelectStore = () => {} } = handlers;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'shopily-table__link';
  button.textContent = instance.label;
  button.addEventListener('click', event => {
    event.stopPropagation();
    onSelectStore(instance.id);
  });
  return button;
}

function renderNicheCell(instance, formatters = {}) {
  const { formatPercent = value => String(value ?? '') } = formatters;
  const wrapper = document.createElement('div');
  wrapper.className = 'shopily-niche';
  if (instance.niche) {
    const name = document.createElement('strong');
    name.className = 'shopily-niche__name';
    name.textContent = instance.niche.name;
    const trend = document.createElement('span');
    trend.className = 'shopily-niche__trend';
    const delta = formatNicheDelta(instance.niche.delta, formatPercent);
    trend.textContent = delta || `${formatPercent(instance.niche.multiplier - 1)} boost`;
    wrapper.append(name, trend);
    return wrapper;
  }
  wrapper.textContent = 'Unassigned';
  return wrapper;
}

export function mapTableColumns() {
  return TABLE_COLUMNS.map(column => ({
    id: column.id,
    label: column.label,
    className: 'shopily-table__heading'
  }));
}

export function mapTableRows(instances, state, dependencies = {}) {
  const { formatters = {}, handlers = {} } = dependencies;
  const formatCurrency = formatters.formatCurrency || (value => String(value ?? ''));
  const formatPercent = formatters.formatPercent || (value => String(value ?? ''));
  const rows = [];
  const selectedId = state.selectedStoreId;
  ensureArray(instances).forEach(instance => {
    const cells = [];
    const actions = [];
    TABLE_COLUMNS.forEach(column => {
      if (!column) return;
      const cell = { className: column.cellClassName };
      switch (column.renderer) {
        case 'name':
          cell.content = renderNameCell(instance, handlers);
          break;
        case 'niche':
          cell.content = renderNicheCell(instance, formatters);
          break;
        case 'earnings':
          cell.content = formatCurrency(instance.latestPayout || 0);
          break;
        case 'upkeep':
          cell.content = formatCurrency(instance.maintenanceCost || 0);
          break;
        case 'roi':
          cell.content = formatPercent(instance.roi);
          break;
        case 'actions':
          actions.push(
            {
              id: 'upgrade',
              label: 'Upgrade Store',
              className: 'shopily-button shopily-button--ghost',
              onSelect(rowId) {
                handlers.onShowUpgradesForStore?.(rowId);
              }
            },
            {
              id: 'details',
              label: 'View Details',
              className: 'shopily-button shopily-button--link',
              onSelect(rowId) {
                handlers.onSelectStore?.(rowId);
              }
            }
          );
          return;
        default:
          cell.content = instance[column.id];
      }
      cells.push(cell);
    });
    rows.push({
      id: instance.id,
      cells,
      actions: actions.filter(Boolean),
      isSelected: instance.id === selectedId
    });
  });
  return rows;
}

export default function mapStoreTable(instances, state, dependencies = {}) {
  return {
    theme: TABLE_THEME,
    columns: mapTableColumns(),
    rows: mapTableRows(instances, state, dependencies),
    selectedId: state.selectedStoreId,
    onSelect(id) {
      dependencies.handlers?.onSelectStore?.(id);
    },
    emptyState: {
      message: 'No stores yet. Launch your first shop to start capturing daily sales.'
    }
  };
}
