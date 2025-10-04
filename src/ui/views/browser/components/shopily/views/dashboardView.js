import { ensureArray } from '../../../../../../core/helpers.js';
import renderHero from './dashboard/hero.js';
import mapStoreTable from './dashboard/tableMappers.js';
import mapStoreDetail from './dashboard/detailMapper.js';

export default function renderDashboardView(options = {}) {
  const {
    model = {},
    state = {},
    formatters = {},
    handlers = {},
    selectors = {},
    createLaunchButton = () => document.createElement('button')
  } = options;

  return function renderDashboardSection(viewContext = {}) {
    const {
      model: viewModel = model,
      state: viewState = state,
      renderKpiGrid,
      renderInstanceTable,
      renderDetailPanel
    } = viewContext;

    const container = document.createElement('section');
    container.className = 'shopily-view shopily-view--dashboard';

    container.appendChild(
      renderHero(viewModel, { formatters, createLaunchButton, renderKpiGrid })
    );

    const grid = document.createElement('div');
    grid.className = 'shopily-grid';
    const instances = ensureArray(viewModel.instances);
    grid.append(
      renderInstanceTable(mapStoreTable(instances, viewState, { formatters, handlers })),
      renderDetailPanel(mapStoreDetail(viewModel, viewState, { selectors, formatters, handlers }))
    );

    container.appendChild(grid);
    return container;
  };
}
