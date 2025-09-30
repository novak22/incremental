import { getState } from '../core/state.js';
import classicDashboardPresenter from './views/classic/dashboardPresenter.js';
import {
  buildAssetUpgradeRecommendations,
  buildDashboardModel,
  buildQuickActions
} from './dashboard/model.js';

export { buildAssetUpgradeRecommendations, buildQuickActions, buildDashboardModel };

export function renderDashboard(state, summary, presenter = classicDashboardPresenter) {
  const activeState = state ?? getState();
  if (!activeState) return;

  const model = buildDashboardModel(activeState, summary);
  if (!model) return;

  const targetPresenter = presenter ?? classicDashboardPresenter;
  if (typeof targetPresenter?.renderDashboard === 'function') {
    targetPresenter.renderDashboard(model);
  }
}
