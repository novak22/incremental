import { ensureArray } from '../../../../../../core/helpers.js';
import { KPI_THEME, mapHeroStats } from './dashboard/heroStats.js';
import { mapInstanceTable } from './dashboard/instanceTable.js';
import { mapDetailPanel } from './dashboard/detailPanel.js';

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

    const statsItems = mapHeroStats(model.stats || {}, helpers);
    container.appendChild(renderKpiGrid({ items: statsItems, theme: KPI_THEME }));

    const layout = document.createElement('div');
    layout.className = 'videotube-dashboard';

    const instances = ensureArray(model.instances);
    layout.append(
      renderInstanceTable(mapInstanceTable(instances, state, helpers)),
      renderDetailPanel(mapDetailPanel(instances, state, helpers))
    );

    container.appendChild(layout);
    return container;
  };
}

export default {
  createDashboardView
};
