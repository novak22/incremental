import { getElement } from '../../elements/registry.js';
import todoWidget from './widgets/todoWidget.js';

const widgetModules = {
  todo: todoWidget
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

function renderDashboard(viewModel = {}) {
  if (!viewModel) return;
  renderTodo(viewModel.quickActions || {});
}

export default {
  renderDashboard
};
