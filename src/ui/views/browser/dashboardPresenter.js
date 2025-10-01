import { getElement } from '../../elements/registry.js';
import todoWidget from './widgets/todoWidget.js';
import appsWidget from './widgets/appsWidget.js';
import bankWidget from './widgets/bankWidget.js';

const widgetModules = {
  todo: todoWidget,
  apps: appsWidget,
  bank: bankWidget
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

function renderTodo(actions = {}) {
  const widget = ensureWidget('todo');
  widget?.render(actions);
}

function renderApps(context = {}) {
  const widget = ensureWidget('apps');
  widget?.render(context);
}

function renderBank(context = {}) {
  const widget = ensureWidget('bank');
  widget?.render(context);
}

function renderDashboard(viewModel = {}, context = {}) {
  if (!viewModel) return;
  renderTodo(viewModel.quickActions || {});
  renderApps(context);
  renderBank(context);
}

export default {
  renderDashboard
};
