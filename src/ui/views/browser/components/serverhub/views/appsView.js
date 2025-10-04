import { ensureArray } from '../../../../../../core/helpers.js';
import renderActionConsole from './apps/actionConsole.js';
import { renderNicheCell, renderNichePanel } from './apps/nicheSelector.js';
import renderPayoutBreakdown from './apps/payoutBreakdown.js';
import renderQualityPanel from './apps/qualityPanel.js';
import renderDetailSidebar from './apps/detailSidebar.js';
import createAppsTable from './apps/appsTable.js';

const renderAppsTable = createAppsTable({ renderNicheCell });

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
  (instance, helpers) => renderPayoutBreakdown(instance, helpers)
];

const DETAIL_FOOTER = (instance, helpers) => renderActionConsole(instance, helpers);

function renderMetrics(model, helpers) {
  const metrics = document.createElement('section');
  metrics.className = 'serverhub-kpis';
  const hero = ensureArray(model.summary?.hero);
  hero.forEach(metric => {
    if (!metric) return;
    const descriptor = helpers.kpiDescriptors.get(metric.id)
      || helpers.kpiDescriptors.get('default')
      || {};
    const card = document.createElement('article');
    card.className = 'serverhub-kpi';
    const label = document.createElement('span');
    label.className = 'serverhub-kpi__label';
    label.textContent = metric.label;
    const value = document.createElement('p');
    value.className = 'serverhub-kpi__value';
    value.textContent = formatKpiValue(metric, descriptor, helpers);
    card.append(label, value);
    if (metric.note) {
      const note = document.createElement('span');
      note.className = 'serverhub-kpi__note';
      note.textContent = metric.note;
      card.appendChild(note);
    }
    metrics.appendChild(card);
  });
  return metrics;
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

  const detailConfig = {
    stats: DETAIL_STATS_CONFIG,
    panels: DETAIL_PANELS,
    footer: DETAIL_FOOTER
  };

  return function renderAppsView({ model = {}, state = {}, updateState }) {
    const section = document.createElement('section');
    section.className = 'serverhub-view serverhub-view--apps';
    section.appendChild(renderMetrics(model, helpers));

    const layout = document.createElement('div');
    layout.className = 'serverhub-layout';
    const instances = ensureArray(model.instances);
    layout.append(
      renderAppsTable(instances, state, helpers, updateState),
      renderDetailSidebar(model, state, helpers, detailConfig)
    );

    section.appendChild(layout);
    return section;
  };
}

export default {
  createAppsView
};
