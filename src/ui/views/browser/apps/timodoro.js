import { getState } from '../../../../core/state.js';
import { computeDailySummary } from '../../../../game/summary.js';
import timodoroApp from './timodoro/ui.js';
import { createWorkspaceRenderer } from '../utils/workspaceFactories.js';
import { buildTimodoroViewModel } from './timodoro/model.js';
import { buildActionQueue } from '../../../actions/registry.js';

const renderTimodoroWorkspace = createWorkspaceRenderer({
  pageType: 'timodoro',
  mountRole: 'timodoro-root',
  renderApp: (model, options) => timodoroApp.render(model, options),
  deriveMeta: ({ summary, model, fallback }) => summary?.meta || model?.meta || fallback || '',
  fallbackMeta: 'Productivity ready',
});

function resolveViewModel(model, state) {
  if (model && typeof model === 'object') {
    if (model.completedGroups || model.recurringEntries || model.summaryEntries) {
      return model;
    }
    if (model.timodoro && typeof model.timodoro === 'object') {
      return model.timodoro;
    }
  }

  const summary = computeDailySummary(state);
  const todoModel = buildActionQueue({ state, summary });

  return buildTimodoroViewModel(state, summary, todoModel);
}

export default function renderTimodoro(context = {}, definitions = [], model = {}) {
  const state = getState() || {};
  const viewModel = resolveViewModel(model, state);
  return renderTimodoroWorkspace(context, definitions, viewModel);
}
