import { renderDashboard as renderDashboardCore } from '../../dashboard.js';
import { registerView } from '../../viewManager.js';
import dashboardPresenter from './dashboardPresenter.js';

const classicView = {
  id: 'classic',
  renderDashboard(state, summary) {
    renderDashboardCore(state, summary, dashboardPresenter);
  }
};

registerView(classicView.id, classicView);

export default classicView;
