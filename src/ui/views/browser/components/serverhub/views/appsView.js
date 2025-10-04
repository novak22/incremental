import { ensureArray } from '../../../../../../core/helpers.js';
import { mapAppsTable } from './apps/appsTable.js';
import { mapDetailSidebar } from './apps/detailSidebar.js';

const KPI_THEME = {
  container: 'asset-kpis serverhub-kpis',
  grid: 'asset-kpis__grid',
  card: 'asset-kpi serverhub-kpi',
  label: 'asset-kpi__label serverhub-kpi__label',
  value: 'asset-kpi__value serverhub-kpi__value',
  note: 'asset-kpi__note serverhub-kpi__note',
  empty: 'asset-kpis__empty serverhub-kpis__empty'
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

function mapHeroMetrics(summary = {}, helpers) {
  const hero = ensureArray(summary.hero);
  return hero
    .map(metric => {
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
    })
    .filter(Boolean);
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

  return function renderAppsView(viewContext = {}) {
    const {
      model = {},
      state = {},
      updateState,
      renderKpiGrid,
      renderInstanceTable,
      renderDetailPanel
    } = viewContext;

    const section = document.createElement('section');
    section.className = 'serverhub-view serverhub-view--apps';

    if (typeof renderKpiGrid === 'function') {
      section.appendChild(
        renderKpiGrid({
          items: mapHeroMetrics(model.summary || {}, helpers),
          theme: KPI_THEME,
          emptyState: {
            message: 'Deploy your first SaaS to see uptime, revenue, and growth KPIs.'
          }
        })
      );
    }

    const layout = document.createElement('div');
    layout.className = 'serverhub-layout';

    const selectInstance = typeof updateState === 'function'
      ? id => updateState(current => ({ ...current, selectedAppId: id }))
      : () => {};

    const tableConfig = mapAppsTable(ensureArray(model.instances), state, {
      ...helpers,
      selectInstance
    });

    if (typeof renderInstanceTable === 'function') {
      layout.appendChild(renderInstanceTable(tableConfig));
    }

    const detailConfig = mapDetailSidebar(model, state, helpers);

    if (typeof renderDetailPanel === 'function') {
      layout.appendChild(renderDetailPanel(detailConfig));
    }

    section.appendChild(layout);
    return section;
  };
}

export default {
  createAppsView
};
