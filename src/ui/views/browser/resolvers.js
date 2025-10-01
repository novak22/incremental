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
  siteList: root => root.getElementById('browser-site-list'),
  siteListNote: root => root.getElementById('browser-sites-note'),
  addSiteButton: root => root.getElementById('browser-add-site'),
  homepage: root => ({
    container: root.getElementById('browser-home'),
    heading: root.getElementById('browser-home-heading'),
    tagline: root.getElementById('browser-home-tagline')
  }),
  homepageWidgets: root => ({
    focus: {
      container: root.getElementById('browser-widget-focus'),
      note: root.getElementById('browser-widget-focus-note')
    },
    updates: {
      list: root.getElementById('browser-widget-updates'),
      note: root.getElementById('browser-widget-updates-note')
    },
    shortcuts: {
      container: root.getElementById('browser-widget-shortcuts'),
      note: root.getElementById('browser-widget-shortcuts-note')
    }
  })
};

export default resolvers;
