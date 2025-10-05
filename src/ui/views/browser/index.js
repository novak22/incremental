import resolvers from './resolvers.js';
import { renderDashboard as baseRenderDashboard } from '../../dashboard.js';
import dashboardPresenter from './dashboardPresenter.js';
import cardsPresenter from './cardsPresenter.js';
import layoutPresenter from './layoutPresenter.js';
import headerActionPresenter from './headerActionPresenter.js';
import logPresenter from './logPresenter.js';
import { hideDeveloperView } from '../developer/index.js';

const browserView = {
  id: 'browser',
  name: 'Browser Chrome',
  resolvers,
  presenters: {
    dashboard: dashboardPresenter,
    cards: cardsPresenter,
    layout: layoutPresenter,
    headerAction: headerActionPresenter,
    log: logPresenter
  },
  onActivate({ root } = {}) {
    hideDeveloperView(root);
  },
  renderDashboard(state, summary) {
    baseRenderDashboard(state, summary, dashboardPresenter);
  }
};

export default browserView;
