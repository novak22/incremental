import { getState } from '../../../core/state.js';
import { getElement } from '../../elements/registry.js';
import notificationsPresenter from './notificationsPresenter.js';
import { buildActionQueue } from '../../actions/registry.js';
import layoutManagerFallback from './widgets/layoutManager.js';

function resolveLayoutManager() {
  const record = getElement('homepageWidgets');
  if (record?.layoutManager) {
    return record.layoutManager;
  }
  return layoutManagerFallback;
}

function renderTodo(state, summary = {}) {
  const manager = resolveLayoutManager();
  const widget = manager.getWidgetController('todo');
  if (!widget) return;
  const resolvedState = state || getState() || {};
  const model = buildActionQueue({ state: resolvedState, summary });
  if (typeof widget.render === 'function') {
    widget.render(model);
  }
}

function renderApps(context = {}) {
  const manager = resolveLayoutManager();
  const widget = manager.getWidgetController('apps');
  if (typeof widget?.render === 'function') {
    widget.render(context);
  }
}

function renderBank(context = {}) {
  const manager = resolveLayoutManager();
  const widget = manager.getWidgetController('bank');
  if (typeof widget?.render === 'function') {
    widget.render(context);
  }
}

function renderDashboard(viewModel = {}, context = {}) {
  if (!viewModel) return;
  resolveLayoutManager().renderLayout();
  notificationsPresenter.render(viewModel.eventLog || {});
  renderTodo(context?.state, context?.summary || {});
  renderApps(context);
  renderBank(context);
}

function resetForTests() {
  resolveLayoutManager().__testables?.reset?.();
}

const __testables = {
  reset: resetForTests,
  hasController(id) {
    return Boolean(resolveLayoutManager().__testables?.hasController?.(id));
  }
};

export default {
  renderDashboard
};

export {
  renderTodo,
  __testables
};
