import { ensureArray } from '../../../../../../../core/helpers.js';
import { renderNicheCell } from './nicheSelector.js';

const TABLE_THEME = {
  container: 'asset-table serverhub-table-wrapper',
  table: 'asset-table__table serverhub-table',
  headCell: 'asset-table__heading serverhub-table__heading',
  row: 'asset-table__row serverhub-table__row',
  cell: 'asset-table__cell serverhub-table__cell',
  actionsCell: 'asset-table__cell--actions serverhub-table__cell--actions',
  actions: 'asset-table__actions serverhub-action-group',
  actionButton: 'serverhub-button serverhub-button--ghost serverhub-button--compact',
  empty: 'asset-table__empty serverhub-empty'
};

function mapTableColumns(columns = []) {
  return ensureArray(columns)
    .filter(Boolean)
    .map(column => ({
      id: column.id,
      label: column.label,
      className: column.headerClassName,
      dataset: column.dataset
    }));
}

function createNameCell(instance, selectInstance) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'serverhub-table__link';
  button.textContent = instance.label;
  button.addEventListener('click', event => {
    event.stopPropagation();
    selectInstance(instance.id);
  });
  return button;
}

function createStatusCell(instance) {
  const status = document.createElement('span');
  status.className = 'serverhub-status';
  status.dataset.state = instance.status?.id || 'setup';
  status.textContent = instance.status?.label || 'Setup';
  return status;
}

function createQuickAction(instance, actionId, label, helpers) {
  const action = instance?.actionsById?.[actionId]
    || ensureArray(instance?.actions).find(entry => entry.id === actionId);
  return {
    id: actionId,
    label,
    className: 'serverhub-button serverhub-button--quiet serverhub-button--compact',
    disabled: !action || !action.available,
    title: action?.disabledReason,
    onSelect(rowId) {
      if (!helpers.onQuickAction) return;
      helpers.onQuickAction(rowId, action?.id || actionId);
    }
  };
}

function createRowActions(instance, helpers, selectInstance) {
  const actions = [
    createQuickAction(instance, 'shipFeature', 'Scale Up', helpers),
    createQuickAction(instance, 'improveStability', 'Optimize', helpers),
    {
      id: 'viewDetails',
      label: 'View Details',
      className: 'serverhub-button serverhub-button--ghost serverhub-button--compact',
      onSelect(rowId) {
        selectInstance(rowId);
      }
    }
  ];
  return actions.filter(Boolean);
}

const CELL_RENDERERS = {
  name(instance, { selectInstance }) {
    return createNameCell(instance, selectInstance);
  },
  status(instance) {
    return createStatusCell(instance);
  },
  niche(instance, context) {
    return renderNicheCell(instance, context.helpers);
  },
  payout(instance, context) {
    return context.helpers.formatCurrency(instance.latestPayout || 0);
  },
  upkeep(instance, context) {
    return context.helpers.formatCurrency(instance.upkeepCost || 0);
  },
  roi(instance, context) {
    return context.helpers.formatPercent(instance.roi);
  }
};

function mapInstanceRows(instances, state, helpers, selectInstance) {
  return ensureArray(instances)
    .filter(Boolean)
    .map(instance => {
      const cells = ensureArray(helpers.tableColumns)
        .filter(column => column && column.id !== 'actions')
        .map(column => {
          const renderer = CELL_RENDERERS[column.renderer] || CELL_RENDERERS[column.id];
          const content = renderer ? renderer(instance, { helpers, selectInstance }) : instance[column.id];
          return {
            className: column.cellClassName,
            content: content ?? ''
          };
        });

      return {
        id: instance.id,
        isSelected: instance.id === state.selectedAppId,
        cells,
        actions: createRowActions(instance, helpers, selectInstance)
      };
    });
}

function createEmptyState(helpers) {
  const actions = helpers.onLaunch
    ? [
        {
          id: 'launch-app',
          label: 'Deploy New App',
          className: 'serverhub-button serverhub-button--primary',
          onSelect: () => helpers.onLaunch()
        }
      ]
    : [];

  return {
    message: 'No SaaS apps live yet. Deploy a new instance to kickstart recurring revenue.',
    actions
  };
}

export function mapAppsTable(instances, state, helpers = {}) {
  const selectInstance = typeof helpers.selectInstance === 'function'
    ? helpers.selectInstance
    : () => {};

  return {
    theme: TABLE_THEME,
    columns: mapTableColumns(helpers.tableColumns),
    rows: mapInstanceRows(instances, state, helpers, selectInstance),
    selectedId: state?.selectedAppId,
    onSelect: selectInstance,
    emptyState: createEmptyState(helpers)
  };
}
