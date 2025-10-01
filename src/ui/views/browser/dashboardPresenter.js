import { getElement } from '../../elements/registry.js';
import setText from '../../dom.js';
import todoWidget from './widgets/todoWidget.js';
import earningsWidget from './widgets/earningsWidget.js';
import notificationsWidget from './widgets/notificationsWidget.js';

const widgetModules = {
  todo: todoWidget,
  earnings: earningsWidget,
  notifications: notificationsWidget
};

function getWidgetMounts() {
  return getElement('homepageWidgets') || {};
}

function ensureWidget(key) {
  const module = widgetModules[key];
  if (!module) return null;
  const mounts = getWidgetMounts();
  const target = mounts[key];
  if (!target) return null;
  if (typeof module.init === 'function') {
    module.init(target);
  }
  return module;
}

function resolveNotificationAction(entry) {
  if (!entry?.action) return null;
  if (entry.action.type === 'shell-tab') {
    const tabId = entry.action.tabId;
    return () => {
      const { shellTabs = [] } = getElement('shellNavigation') || {};
      shellTabs.find(tab => tab.id === tabId)?.click();
    };
  }
  if (typeof entry.action === 'function') {
    return () => entry.action();
  }
  return null;
}

function renderHomepageShell(session = {}) {
  const homepage = getElement('homepage') || {};
  if (homepage.heading) {
    setText(homepage.heading, session.statusText || 'Browser Homepage');
  }
  if (homepage.tagline) {
    const money = session.moneyText || '$0';
    setText(homepage.tagline, `Wallet humming at ${money}. Deploy those hours with style.`);
  }
}

function renderTodo(actions = {}) {
  const widget = ensureWidget('todo');
  widget?.render(actions);
}

function renderEarnings(headerMetrics = {}, kpis = {}) {
  const widget = ensureWidget('earnings');
  if (!widget) return;
  widget.render({
    inflow: headerMetrics.dailyPlus,
    outflow: headerMetrics.dailyMinus,
    net: kpis.net
  });
}

function renderNotifications(notifications = {}) {
  const widget = ensureWidget('notifications');
  if (!widget) return;
  widget.render(notifications, { resolveAction: resolveNotificationAction });
}

function renderDashboard(viewModel = {}) {
  if (!viewModel) return;
  renderHomepageShell(viewModel.session || {});
  renderTodo(viewModel.quickActions || {});
  renderEarnings(viewModel.headerMetrics || {}, viewModel.kpis || {});
  renderNotifications(viewModel.notifications || {});
}

export default {
  renderDashboard
};
