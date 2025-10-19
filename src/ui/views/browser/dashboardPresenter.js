import { getState } from '../../../core/state.js';
import notificationsPresenter from './notificationsPresenter.js';
import { buildActionQueue } from '../../actions/registry.js';
import layoutManager from './widgets/layoutManager.js';

function renderTodo(state, summary = {}) {
  const widget = layoutManager.getWidgetController('todo');
  if (!widget) return;
  const resolvedState = state || getState() || {};
  const model = buildActionQueue({ state: resolvedState, summary });
  if (typeof widget.render === 'function') {
    widget.render(model);
  }
}

function renderApps(context = {}) {
  const widget = layoutManager.getWidgetController('apps');
  if (typeof widget?.render === 'function') {
    widget.render(context);
  }
}

function renderBank(context = {}) {
  const widget = layoutManager.getWidgetController('bank');
  if (typeof widget?.render === 'function') {
    widget.render(context);
  }
}

function renderDashboard(viewModel = {}, context = {}) {
  if (!viewModel) return;
  layoutManager.renderLayout();
  notificationsPresenter.render(viewModel.eventLog || {});
  renderTodo(context?.state, context?.summary || {});
  renderApps(context);
  renderBank(context);
}

function resetForTests() {
  layoutManager.__testables?.reset?.();
}

const __testables = {
  reset: resetForTests,
  hasController(id) {
    return Boolean(layoutManager.__testables?.hasController?.(id));
  }
};

export default {
  renderDashboard
};

export {
  renderTodo,
  __testables
};
