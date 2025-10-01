import resolvers from './resolvers.js';
import { renderDashboard as baseRenderDashboard } from '../../dashboard.js';
import dashboardPresenter from './dashboardPresenter.js';
import cardsPresenter from './cardsPresenter.js';

const classicView = {
  id: 'classic',
  name: 'Classic Dashboard',
  resolvers,
  presenters: {
    dashboard: dashboardPresenter,
    cards: cardsPresenter
  },
  renderDashboard(state, summary) {
    baseRenderDashboard(state, summary, dashboardPresenter);
  }
};

export default classicView;
