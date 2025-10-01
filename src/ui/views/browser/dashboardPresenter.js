import { getElement } from '../../elements/registry.js';
import setText from '../../dom.js';
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

function renderHomepageShell(session = {}) {
  const homepage = getElement('homepage') || {};
  if (homepage.heading) {
    setText(homepage.heading, 'Launch the day');
  }
  if (homepage.tagline) {
    setText(homepage.tagline, session.statusText || 'Day 0 • 0h remaining');
  }
}

function renderTodo(actions = {}) {
  const widget = ensureWidget('todo');
  widget?.render(actions);
}

function renderDashboard(viewModel = {}) {
  if (!viewModel) return;
  renderHomepageShell(viewModel.session || {});
  renderTodo(viewModel.quickActions || {});
}

export default {
  renderDashboard
};
