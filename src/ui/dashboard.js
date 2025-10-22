import { getActiveView } from './viewManager.js';
import { selectGameState } from './selectors/state.js';
import { selectDashboardViewModel } from './selectors/dashboard.js';

export function renderDashboard(state, summary, presenter) {
  const currentState = state ?? selectGameState();
  if (!currentState) return;

  const viewModel = selectDashboardViewModel(currentState, summary);
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
