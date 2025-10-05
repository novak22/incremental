import { getElement } from '../../elements/registry.js';
import { getState } from '../../../core/state.js';
import todoWidget from './widgets/todoWidget.js';
import appsWidget from './widgets/appsWidget.js';
import bankWidget from './widgets/bankWidget.js';
import notificationsPresenter from './notificationsPresenter.js';
import { buildActionQueue } from '../../actions/registry.js';

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

function renderTodo(state, summary = {}) {
  const widget = ensureWidget('todo');
  if (!widget) return;
  const resolvedState = state || getState() || {};
  const model = buildActionQueue({ state: resolvedState, summary });
  widget.render(model);
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
  notificationsPresenter.render(viewModel.eventLog || {});
  renderTodo(context?.state, context?.summary || {});
  renderApps(context);
  renderBank(context);
}

export default {
  renderDashboard
};

export { renderTodo };
