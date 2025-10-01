import { getState } from '../core/state.js';
import { buildDashboardViewModel } from './dashboard/model.js';
import { getActiveView } from './viewManager.js';

export { buildDashboardViewModel } from './dashboard/model.js';

export function renderDashboard(state, summary, presenter) {
  const currentState = state ?? getState();
  if (!currentState) return;

  const viewModel = buildDashboardViewModel(currentState, summary);
  if (!viewModel) return;

  const activePresenter = presenter ?? getActiveView()?.presenters?.dashboard;
  if (activePresenter?.renderDashboard) {
    activePresenter.renderDashboard(viewModel, {
      state: currentState,
      summary,
      niche: viewModel.niche
    });
  }
}
