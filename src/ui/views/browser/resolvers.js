function selectFirst(root, selectors = []) {
  if (!root) return null;
  for (const selector of selectors) {
    if (!selector) continue;
    const node = root.querySelector(selector);
    if (node) {
      return node;
    }
  }
  return null;
}

function resolveNotificationContainer(root) {
  return (
    selectFirst(root, [
      '[data-role="browser-notifications"]',
      '[data-role="notifications"]',
      '[data-notifications]',
      '[data-component="notifications"]',
      '#browser-notifications',
      '#notifications',
      '.browser-notifications',
      '.notifications'
    ]) || null
  );
}

function resolveNotificationPart(root, container, selectors = []) {
  return (
    selectFirst(container, selectors) ||
    selectFirst(root, selectors)
  );
}

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
    const container = resolveNotificationContainer(root);
    if (!container) return null;
    return {
      container,
      button: resolveNotificationPart(root, container, [
        '#browser-notifications-button',
        '[data-role="browser-notifications-button"]',
        '[data-role="notifications-button"]',
        '[data-notifications-button]',
        '[data-notification-button]',
        '#notifications-button',
        '.browser-notifications__trigger',
        '.notifications__trigger'
      ]),
      panel: resolveNotificationPart(root, container, [
        '#browser-notifications-panel',
        '[data-role="browser-notifications-panel"]',
        '[data-role="notifications-panel"]',
        '[data-notifications-panel]',
        '#notifications-panel',
        '#notifications-dropdown',
        '.browser-notifications__panel',
        '.notifications__panel'
      ]),
      list: resolveNotificationPart(root, container, [
        '#browser-notifications-list',
        '[data-role="browser-notifications-list"]',
        '[data-role="notifications-list"]',
        '[data-notifications-list]',
        '#notifications-list',
        '.browser-notifications__list',
        '.notifications__list'
      ]),
      empty: resolveNotificationPart(root, container, [
        '#browser-notifications-empty',
        '[data-role="browser-notifications-empty"]',
        '[data-role="notifications-empty"]',
        '[data-notifications-empty]',
        '#notifications-empty',
        '.browser-notifications__empty',
        '.notifications__empty'
      ]),
      badge: resolveNotificationPart(root, container, [
        '#browser-notifications-badge',
        '[data-role="browser-notifications-badge"]',
        '[data-role="notifications-badge"]',
        '[data-notifications-badge]',
        '#notifications-badge',
        '.browser-notifications__badge',
        '.notifications__badge'
      ]),
      markAll: resolveNotificationPart(root, container, [
        '#browser-notifications-mark-all',
        '[data-role="browser-notifications-mark-all"]',
        '[data-role="notifications-mark-all"]',
        '[data-notifications-mark-all]',
        '#notifications-mark-all'
      ])
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
  homepageWidgets: root => {
    const container = root.querySelector('.browser-home__widgets');
    if (!container) {
      return null;
    }

    const listWidgets = () => {
      if (!container?.querySelectorAll) {
        return [];
      }
      return Array.from(container.querySelectorAll('[data-widget]'));
    };

    const getWidgetContainer = widgetId => {
      if (!widgetId) return null;
      const widgets = listWidgets();
      return widgets.find(node => node?.dataset?.widget === widgetId) || null;
    };

    return {
      container,
      getWidgetContainer,
      getWidgetContainers: listWidgets
    };
  }
};

export default resolvers;
