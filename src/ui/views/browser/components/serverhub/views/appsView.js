import { renderKpiGrid } from '../../common/renderKpiGrid.js';
import { renderInstanceTable } from '../../common/renderInstanceTable.js';
import { renderDetailPanel } from '../../common/renderDetailPanel.js';
import { ensureArray } from '../../../../../../core/helpers.js';
import renderActionConsole from './apps/actionConsole.js';
import { renderNicheCell, renderNichePanel } from './apps/nicheSelector.js';
import renderPayoutBreakdown from './apps/payoutBreakdown.js';
import renderQualityPanel from './apps/qualityPanel.js';

const KPI_THEME = {
  container: 'asset-kpis serverhub-kpis',
  grid: 'asset-kpis__grid',
  card: 'asset-kpi serverhub-kpi',
  label: 'asset-kpi__label serverhub-kpi__label',
  value: 'asset-kpi__value serverhub-kpi__value',
  note: 'asset-kpi__note serverhub-kpi__note',
  empty: 'asset-kpis__empty serverhub-kpis__empty'
};

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

const DETAIL_THEME = {
  container: 'asset-detail serverhub-sidebar',
  header: 'serverhub-detail__header',
  title: 'serverhub-detail__title',
  subtitle: 'serverhub-detail__subtitle',
  status: 'serverhub-status',
  tabs: 'serverhub-detail__tabs',
  stats: 'asset-detail__stats serverhub-detail__stats',
  stat: 'asset-detail__stat serverhub-detail__stat',
  statLabel: 'asset-detail__stat-label serverhub-detail__stat-label',
  statValue: 'asset-detail__stat-value serverhub-detail__stat-value',
  statNote: 'asset-detail__stat-note serverhub-detail__stat-note',
  sections: 'asset-detail__sections serverhub-detail__grid',
  section: 'asset-detail__section serverhub-panel',
  sectionTitle: 'asset-detail__section-title',
  sectionBody: 'asset-detail__section-body serverhub-panel__hint',
  actions: 'asset-detail__actions serverhub-action-group',
  actionButton: 'serverhub-button serverhub-button--ghost serverhub-button--compact',
  empty: 'asset-detail__empty serverhub-detail__empty'
};

function formatKpiValue(metric, descriptor, helpers) {
  const { formatCurrency, formatNetCurrency } = helpers;
  const formatter = descriptor?.formatter || descriptor?.format;
  if (typeof formatter === 'function') {
    return formatter(metric, helpers);
  }
  switch (descriptor?.formatter) {
    case 'activeCount':
      return `${metric.value || 0} deployed`;
    case 'netCurrency':
      return formatNetCurrency(metric.value || 0);
    case 'currency':
    default:
      return formatCurrency(metric.value || 0);
  }
}

const DETAIL_STATS_CONFIG = [
  {
    label: 'Daily earnings',
    getValue: (instance, helpers) => helpers.formatCurrency(instance.latestPayout)
  },
  {
    label: 'Average daily',
    getValue: (instance, helpers) => helpers.formatCurrency(instance.averagePayout)
  },
  {
    label: 'Pending income',
    getValue: (instance, helpers) => helpers.formatCurrency(instance.pendingIncome)
  },
  {
    label: 'Lifetime revenue',
    getValue: (instance, helpers) => helpers.formatCurrency(instance.lifetimeIncome)
  },
  {
    label: 'Lifetime spend',
    getValue: (instance, helpers) => helpers.formatCurrency(instance.lifetimeSpend)
  },
  {
    label: 'Net profit',
    getValue: (instance, helpers) => helpers.formatNetCurrency(instance.profit)
  },
  {
    label: 'ROI',
    getValue: (instance, helpers) => helpers.formatPercent(instance.roi)
  },
  {
    label: 'Days live',
    getValue: instance => `${instance.daysLive} day${instance.daysLive === 1 ? '' : 's'}`
  }
];

const DETAIL_PANELS = [
  instance => renderQualityPanel(instance),
  (instance, helpers) => renderNichePanel(instance, helpers),
  (instance, helpers) => renderPayoutBreakdown(instance, helpers),
  (instance, helpers) => renderActionConsole(instance, helpers)
];

function mapHeroMetrics(summary = {}, helpers) {
  const hero = ensureArray(summary.hero);
  return hero.map(metric => {
    if (!metric) return null;
    const descriptor = helpers.kpiDescriptors.get(metric.id)
      || helpers.kpiDescriptors.get('default')
      || {};
    return {
      id: metric.id,
      label: metric.label,
      note: metric.note,
      className: 'serverhub-kpi',
      formatValue: () => formatKpiValue(metric, descriptor, helpers)
    };
  }).filter(Boolean);
}

function mapTableColumns(columns = []) {
  return columns
    .filter(Boolean)
    .map(column => ({
      id: column.id,
      label: column.label,
      className: column.headerClassName
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

function createCurrencyCell(value, formatter) {
  return formatter(value || 0);
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
    return createCurrencyCell(instance.latestPayout, context.helpers.formatCurrency);
  },
  upkeep(instance, context) {
    return createCurrencyCell(instance.upkeepCost, context.helpers.formatCurrency);
  },
  roi(instance, context) {
    return context.helpers.formatPercent(instance.roi);
  }
};

function mapInstanceRows(instances, state, helpers, updateState) {
  const selectInstance = id => {
    updateState(current => ({ ...current, selectedAppId: id }));
  };
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

function convertPanelToSection(panel) {
  if (!panel) return null;
  const fragment = document.createDocumentFragment();
  while (panel.firstChild) {
    fragment.appendChild(panel.firstChild);
  }
  return {
    className: panel.className,
    content: fragment
  };
}

function mapDetailSections(instance, helpers) {
  return DETAIL_PANELS
    .map(renderPanel => convertPanelToSection(renderPanel(instance, helpers)))
    .filter(Boolean);
}

function mapDetailStats(instance, helpers) {
  return DETAIL_STATS_CONFIG.map(entry => ({
    label: entry.label,
    value: entry.getValue(instance, helpers),
    note: typeof entry.getNote === 'function' ? entry.getNote(instance, helpers) : entry.note
  }));
}

export function createAppsView(options = {}) {
  const {
    formatCurrency,
    formatNetCurrency,
    formatPercent,
    formatHours,
    kpiDescriptors,
    tableColumns,
    actionConsoleOrder,
    onQuickAction,
    onNicheSelect,
    onLaunch,
    getSelectedApp
  } = options;

  const helpers = {
    formatCurrency,
    formatNetCurrency,
    formatPercent,
    formatHours,
    kpiDescriptors,
    tableColumns,
    actionConsoleOrder,
    onQuickAction,
    onNicheSelect,
    onLaunch,
    getSelectedApp
  };

  return function renderAppsView({ model = {}, state = {}, updateState }) {
    const section = document.createElement('section');
    section.className = 'serverhub-view serverhub-view--apps';

    section.appendChild(
      renderKpiGrid({
        items: mapHeroMetrics(model.summary || {}, helpers),
        theme: KPI_THEME,
        emptyState: {
          message: 'Deploy your first SaaS to see uptime, revenue, and growth KPIs.'
        }
      })
    );

    const layout = document.createElement('div');
    layout.className = 'serverhub-layout';
    const instances = ensureArray(model.instances);

    const rows = mapInstanceRows(instances, state, helpers, updateState);
    const table = renderInstanceTable({
      theme: TABLE_THEME,
      columns: mapTableColumns(helpers.tableColumns),
      rows,
      selectedId: state.selectedAppId,
      onSelect: id => {
        updateState(current => ({ ...current, selectedAppId: id }));
      },
      emptyState: {
        message: 'No SaaS apps live yet. Deploy a new instance to kickstart recurring revenue.',
        actions: helpers.onLaunch
          ? [
              {
                id: 'launch-app',
                label: 'Deploy New App',
                className: 'serverhub-button serverhub-button--primary',
                onSelect: () => helpers.onLaunch()
              }
            ]
          : []
      }
    });

    const selected = typeof helpers.getSelectedApp === 'function'
      ? helpers.getSelectedApp(model, state)
      : null;

    const detail = renderDetailPanel({
      theme: DETAIL_THEME,
      isEmpty: !selected,
      emptyState: {
        title: 'Select an app',
        message: 'Choose an app to inspect uptime, payouts, and quality progress.'
      },
      header: selected
        ? {
            title: selected.label,
            status: {
              className: 'serverhub-status',
              dataset: { state: selected.status?.id || 'setup' },
              label: selected.status?.label || 'Setup'
            }
          }
        : undefined,
      stats: selected ? mapDetailStats(selected, helpers) : [],
      sections: selected ? mapDetailSections(selected, helpers) : []
    });

    layout.append(table, detail);

    section.appendChild(layout);
    return section;
  };
}

export default {
  createAppsView
};
