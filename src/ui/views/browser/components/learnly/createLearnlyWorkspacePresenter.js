import { formatDays, formatHours } from '../../../../../core/helpers.js';
import { formatCurrency as baseFormatCurrency } from '../../utils/formatting.js';
import { createTabbedWorkspacePresenter } from '../../utils/createTabbedWorkspacePresenter.js';
import { buildContext, createEmptyContext, describeSkills } from './context.js';
import { INITIAL_STATE, ensureSelectedCourse, deriveSummaryFromContext, deriveWorkspacePath } from './reducers.js';
import { createLearnlyHandlers } from './handlers.js';
import { renderLearnlyHeader, renderLearnlyView } from './views/workspaceView.js';

export function createLearnlyWorkspacePresenter() {
  let currentDefinitions = [];
  let currentContext = createEmptyContext();
  let handlers = {};

  const formatCurrency = amount => baseFormatCurrency(amount, { clampZero: true });

  const presenter = createTabbedWorkspacePresenter({
    className: 'learnly',
    state: { ...INITIAL_STATE },
    beforeRender(renderContext) {
      currentContext = buildContext(renderContext.model, currentDefinitions);
      renderContext.learnly = currentContext;
    },
    ensureSelection(state) {
      ensureSelectedCourse(state, currentContext);
    },
    deriveSummary() {
      return deriveSummaryFromContext(currentContext);
    },
    derivePath: deriveWorkspacePath,
    renderHeader(model, state) {
      return renderLearnlyHeader({
        state,
        context: currentContext,
        handlers,
        formatters: { formatHours }
      });
    },
    renderViews(model, state) {
      return renderLearnlyView({
        state,
        context: currentContext,
        handlers,
        formatters: {
          formatCurrency,
          formatHours,
          formatDays
        },
        describeSkills
      });
    }
  });

  const rerender = options => presenter.render(presenter.getModel(), options);
  handlers = createLearnlyHandlers({ presenter, rerender });

  function render(model = {}, context = {}) {
    currentDefinitions = Array.isArray(context.definitions) ? context.definitions : [];
    return presenter.render(model, context);
  }

  return {
    presenter,
    render,
    getContext: () => currentContext
  };
}

