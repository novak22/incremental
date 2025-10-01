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
    container: root.getElementById('browser-home')
  }),
  homepageWidgets: root => ({
    todo: {
      container: root.querySelector('[data-widget="todo"]'),
      list: root.getElementById('browser-widget-todo-list'),
      done: root.getElementById('browser-widget-todo-done'),
      note: root.getElementById('browser-widget-todo-note'),
      doneHeading: root.getElementById('browser-widget-todo-done-heading'),
      availableValue: root.getElementById('browser-widget-todo-available'),
      spentValue: root.getElementById('browser-widget-todo-spent'),
      endDayButton: root.getElementById('browser-widget-todo-end')
    }
  })
};

export default resolvers;
