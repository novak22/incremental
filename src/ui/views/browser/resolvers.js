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
