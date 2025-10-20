import { createLayoutManager } from './widgets/layoutManager.js';

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

const homepageManagers = new WeakMap();
const layoutStorageKeys = new WeakMap();
let nextLayoutStorageId = 1;

function formatStorageKeySuffix(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(/\s+/g, '-');
}

function getLayoutStorageKey(container) {
  const baseKey = 'browser.widgets.layout';
  if (!container) {
    return baseKey;
  }
  if (layoutStorageKeys.has(container)) {
    return layoutStorageKeys.get(container);
  }

  const dataset = container.dataset || {};
  const candidates = [
    dataset.layoutKey,
    container.getAttribute?.('data-layout-key'),
    dataset.widgetHost,
    container.getAttribute?.('data-widget-host'),
    dataset.role,
    container.getAttribute?.('data-role'),
    container.id
  ];

  const suffix = candidates
    .map(formatStorageKeySuffix)
    .find(value => Boolean(value));

  const key = suffix
    ? `${baseKey}.${suffix}`
    : `${baseKey}#${nextLayoutStorageId++}`;

  layoutStorageKeys.set(container, key);
  return key;
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
  sessionSwitcher: root => {
    const container = root.getElementById('browser-session-switcher');
    if (!container) return null;
    return {
      container,
      summaryButton: container.querySelector('[data-session-summary]'),
      name: container.querySelector('[data-session-name]'),
      timestamp: container.querySelector('[data-session-timestamp]'),
      panel: container.querySelector('[data-session-panel]'),
      list: container.querySelector('[data-session-list]'),
      empty: container.querySelector('[data-session-empty]'),
      createButton: container.querySelector('[data-session-create]'),
      resetButton: container.querySelector('[data-session-reset]'),
      closeButton: container.querySelector('[data-session-close]')
    };
  },
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
  browserTabs: root => {
    const container = root.getElementById('browser-tab-bar');
    if (!container) {
      return {
        container: null,
        list: null,
        sidebar: null,
        reorderToggle: null
      };
    }
    const sidebar = container.querySelector('[data-role="browser-tabs-sidebar"]');
    const reorderToggle = sidebar?.querySelector('[data-role="widget-reorder-toggle"]') || null;
    return {
      container,
      list: root.getElementById('browser-tab-list'),
      sidebar,
      reorderToggle
    };
  },
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

    const listTemplates = () => {
      if (!container?.querySelectorAll) {
        return [];
      }
      return Array.from(container.querySelectorAll('template[data-widget-template]'));
    };

    const getTemplate = widgetId => {
      if (!widgetId || !container?.querySelector) {
        return null;
      }
      return container.querySelector(`template[data-widget-template="${widgetId}"]`);
    };

    let entry = homepageManagers.get(container);
    if (!entry) {
      const state = { record: null, manager: null };
      state.manager = createLayoutManager({
        resolveMountRecord: () => state.record,
        storageKey: getLayoutStorageKey(container)
      });
      entry = state;
      homepageManagers.set(container, entry);
    }

    entry.record = {
      container,
      listTemplates,
      getTemplate
    };

    return {
      ...entry.record,
      layoutManager: entry.manager
    };
  }
};

export default resolvers;
