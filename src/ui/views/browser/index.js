import resolvers from './resolvers.js';
import { renderDashboard as baseRenderDashboard } from '../../dashboard.js';
import dashboardPresenter from './dashboardPresenter.js';
import cardsPresenter from './cardsPresenter.js';
import layoutPresenter from './layoutPresenter.js';
import headerActionPresenter from './headerActionPresenter.js';
import logPresenter from './logPresenter.js';

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
    const doc =
      root || (typeof document !== 'undefined' ? document : null);
    const developerRoot = doc?.getElementById('developer-root');
    if (developerRoot) {
      developerRoot.setAttribute('hidden', 'true');
      developerRoot.setAttribute('aria-hidden', 'true');
    }

    if (doc?.body) {
      doc.body.classList.remove('developer-view-active');
    }

    const shell = doc?.querySelector('.browser-shell');
    if (shell) {
      shell.removeAttribute('hidden');
      shell.removeAttribute('aria-hidden');
    }
  },
  renderDashboard(state, summary) {
    baseRenderDashboard(state, summary, dashboardPresenter);
  }
};

export default browserView;
