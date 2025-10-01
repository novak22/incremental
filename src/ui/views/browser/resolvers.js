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
    commandButton: root.getElementById('browser-command-button'),
    endDayButton: root.getElementById('browser-session-button')
  }),
  themeToggle: root => root.getElementById('browser-theme-toggle'),
  headerActionButtons: root => ({
    endDayButton: root.getElementById('browser-session-button'),
    autoForwardButton: null
  }),
  siteList: root => root.getElementById('browser-site-list'),
  siteListNote: root => root.getElementById('browser-sites-note'),
  addSiteButton: root => root.getElementById('browser-add-site'),
  homepage: root => ({
    container: root.getElementById('browser-home'),
    heading: root.getElementById('browser-home-heading'),
    tagline: root.getElementById('browser-home-tagline')
  }),
  homepageWidgets: root => ({
    todo: {
      container: root.querySelector('[data-widget="todo"]'),
      list: root.getElementById('browser-widget-todo-list'),
      done: root.getElementById('browser-widget-todo-done'),
      note: root.getElementById('browser-widget-todo-note'),
      doneHeading: root.getElementById('browser-widget-todo-done-heading')
    },
    earnings: {
      container: root.querySelector('[data-widget="earnings"]'),
      list: root.getElementById('browser-widget-earnings'),
      note: root.getElementById('browser-widget-earnings-note')
    },
    notifications: {
      container: root.querySelector('[data-widget="notifications"]'),
      list: root.getElementById('browser-widget-notifications'),
      note: root.getElementById('browser-widget-notifications-note')
    }
  })
};

export default resolvers;
