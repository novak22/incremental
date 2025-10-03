import { createWorkspacePresenter } from './workspacePresenter.js';

function isNodeLike(value) {
  return value != null && typeof value === 'object' && typeof value.nodeType === 'number';
}

function appendChild(target, node) {
  if (!target || !node) {
    return;
  }
  if (Array.isArray(node)) {
    node.forEach(entry => appendChild(target, entry));
    return;
  }
  if (isNodeLike(node)) {
    target.appendChild(node);
  }
}

/**
 * Creates a presenter for tabbed workspaces with shared rendering patterns.
 *
 * The helper wires common hooks for ensuring selection, syncing navigation,
 * rendering headers, and composing the main view content while delegating the
 * data flow to {@link createWorkspacePresenter}.
 *
 * @param {Object} options
 * @param {Object} [options.state] Initial reducer state for the workspace.
 * @param {(state: Object, model: Object) => void} [options.ensureSelection]
 *   Hook that mutates reducer state to guarantee a valid selection.
 * @param {(model: Object) => Object} [options.deriveSummary]
 *   Hook that maps a model to the summary returned to layout callers.
 * @param {(state: Object, model: Object) => string} [options.derivePath]
 *   Hook used to compute the workspace URL path.
 * @param {(context: Object) => void} [options.syncNavigation]
 *   Hook fired after render to update tab UI state.
 * @param {(model: Object, mount: HTMLElement, context: Object) => void} [options.renderLocked]
 *   Hook that renders locked workspace messaging.
 * @param {(model: Object, state: Object, context: Object) => (Node|Node[]|DocumentFragment|null)} [options.renderHeader]
 *   Hook that renders the workspace header section.
 * @param {(model: Object, state: Object, context: Object) => (Node|Node[]|DocumentFragment|null)} [options.renderViews]
 *   Hook that renders the workspace view content.
 * @param {string} [options.className]
 *   Optional class name applied to the workspace root wrapper.
 * @param {(context: Object) => void} [options.beforeRender]
 * @param {(context: Object) => void} [options.afterRender]
 * @param {(model: Object, state: Object) => boolean} [options.isLocked]
 * @returns {ReturnType<typeof createWorkspacePresenter>}
 */
export function createTabbedWorkspacePresenter(options = {}) {
  const {
    state,
    ensureSelection,
    deriveSummary,
    derivePath,
    syncNavigation,
    renderLocked,
    renderHeader,
    renderViews,
    className,
    beforeRender,
    afterRender,
    isLocked
  } = options;

  const presenter = createWorkspacePresenter({
    state,
    ensureSelection,
    deriveSummary,
    derivePath,
    renderLocked,
    beforeRender,
    afterRender(context) {
      if (typeof syncNavigation === 'function') {
        syncNavigation(context);
      }
      if (typeof afterRender === 'function') {
        afterRender(context);
      }
    },
    isLocked,
    renderBody(model, mount, context) {
      if (!mount) return;
      mount.innerHTML = '';
      const root = document.createElement('div');
      if (className) {
        root.className = className;
      }
      const headerNode = typeof renderHeader === 'function'
        ? renderHeader(model, context.state, context)
        : null;
      const viewNode = typeof renderViews === 'function'
        ? renderViews(model, context.state, context)
        : null;
      appendChild(root, headerNode);
      appendChild(root, viewNode);
      mount.appendChild(root);
    }
  });

  return presenter;
}

export default {
  createTabbedWorkspacePresenter
};
