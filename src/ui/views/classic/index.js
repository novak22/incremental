import resolvers, { classicResolvers } from './resolvers.js';
import { renderDashboard as baseRenderDashboard } from '../../dashboard.js';
import dashboardPresenter from './dashboardPresenter.js';

const classicView = {
  id: 'classic',
  name: 'Classic Dashboard',
  resolvers,
  presenters: {
    dashboard: dashboardPresenter
  },
  renderDashboard(state, summary) {
    baseRenderDashboard(state, summary, dashboardPresenter);
  }
};

export { classicResolvers };
export default classicView;
