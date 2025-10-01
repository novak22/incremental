import resolvers from './resolvers.js';
import { renderDashboard as baseRenderDashboard } from '../../dashboard.js';
import dashboardPresenter from './dashboardPresenter.js';
import cardsPresenter from './cardsPresenter.js';
import playerPresenter from './playerPresenter.js';
import skillsWidgetPresenter from './skillsWidgetPresenter.js';
import headerActionPresenter from './headerActionPresenter.js';
import layoutPresenter from './layoutPresenter.js';
import debugCatalogPresenter from './debugCatalogPresenter.js';
import logPresenter from './logPresenter.js';

const classicView = {
  id: 'classic',
  name: 'Classic Dashboard',
  resolvers,
  presenters: {
    dashboard: dashboardPresenter,
    cards: cardsPresenter,
    player: playerPresenter,
    skillsWidget: skillsWidgetPresenter,
    headerAction: headerActionPresenter,
    layout: layoutPresenter,
    debugCatalog: debugCatalogPresenter,
    log: logPresenter
  },
  renderDashboard(state, summary) {
    baseRenderDashboard(state, summary, dashboardPresenter);
  }
};

export default classicView;
