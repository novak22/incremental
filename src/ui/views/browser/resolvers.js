const resolvers = {
  browserNavigation: root => ({
    backButton: root.getElementById('browser-nav-back'),
    forwardButton: root.getElementById('browser-nav-forward'),
    refreshButton: root.getElementById('browser-nav-refresh')
  }),
  browserAddress: root => ({
    form: root.getElementById('browser-address'),
    input: root.getElementById('browser-address-input')
  }),
  browserSessionControls: root => ({
    homeButton: root.getElementById('browser-home-button'),
    endDayButton: root.getElementById('browser-session-button')
  }),
  browserNotifications: root => {
    const container = root.querySelector('[data-role="browser-notifications"]');
    if (!container) return null;
    return {
      container,
      button: container.querySelector('#browser-notifications-button'),
      panel: container.querySelector('#browser-notifications-panel'),
      list: container.querySelector('#browser-notifications-list'),
      empty: container.querySelector('#browser-notifications-empty'),
      badge: container.querySelector('#browser-notifications-badge'),
      markAll: container.querySelector('#browser-notifications-mark-all')
    };
  },
  themeToggle: root => root.getElementById('browser-theme-toggle'),
  browserTabs: root => ({
    container: root.getElementById('browser-tab-bar'),
    list: root.getElementById('browser-tab-list')
  }),
  launchStage: root => root.getElementById('browser-launch-stage'),
  workspaceHost: root => root.getElementById('browser-workspaces'),
  headerActionButtons: root => ({
    endDayButton: root.getElementById('browser-session-button'),
    autoForwardButton: null
  }),
  siteList: root => root.getElementById('browser-site-list'),
  siteListNote: root => root.getElementById('browser-sites-note'),
  addSiteButton: root => root.getElementById('browser-add-site'),
  homepage: root => ({
    container: root.getElementById('browser-home')
  }),
  homepageWidgets: root => ({
    todo: {
      container: root.querySelector('[data-widget="todo"]'),
      list: root.getElementById('browser-widget-todo-list'),
      done: root.getElementById('browser-widget-todo-done'),
      listWrapper: root.querySelector('[data-widget="todo"] .todo-widget__list-wrapper'),
      note: root.getElementById('browser-widget-todo-note'),
      doneHeading: root.getElementById('browser-widget-todo-done-heading'),
      availableValue: root.getElementById('browser-widget-todo-available'),
      spentValue: root.getElementById('browser-widget-todo-spent'),
      endDayButton: root.getElementById('browser-widget-todo-end'),
      focusGroup: root.querySelector('[data-widget="todo"] [data-focus-group]'),
      focusButtons: root.querySelectorAll('[data-widget="todo"] [data-focus]')
    },
    apps: {
      container: root.querySelector('[data-widget="apps"]'),
      list: root.getElementById('browser-widget-apps-list'),
      note: root.getElementById('browser-widget-apps-note')
    },
    bank: {
      container: root.querySelector('[data-widget="bank"]'),
      stats: root.getElementById('browser-widget-bank-stats'),
      footnote: root.getElementById('browser-widget-bank-footnote'),
      highlights: root.getElementById('browser-widget-bank-highlights')
    }
  })
};

export default resolvers;
