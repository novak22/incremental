import { createWorkspacePathController } from './workspacePaths.js';

export function createWorkspacePresenter({
  initialState = {},
  rootClassName = '',
  ensureSelection,
  derivePath,
  renderLocked,
  renderHeader,
  renderCurrentView,
  deriveSummary
}) {
  if (typeof derivePath !== 'function') {
    throw new TypeError('derivePath must be a function');
  }
  if (typeof renderLocked !== 'function') {
    throw new TypeError('renderLocked must be a function');
  }
  if (typeof renderHeader !== 'function') {
    throw new TypeError('renderHeader must be a function');
  }
  if (typeof renderCurrentView !== 'function') {
    throw new TypeError('renderCurrentView must be a function');
  }
  if (typeof deriveSummary !== 'function') {
    throw new TypeError('deriveSummary must be a function');
  }

  let state = { ...initialState };
  let model = {};
  let mount = null;
  let page = null;

  const pathController = createWorkspacePathController({
    derivePath: () => derivePath(state, model)
  });

  function getState() {
    return state;
  }

  function getModel() {
    return model;
  }

  function getMount() {
    return mount;
  }

  function getPage() {
    return page;
  }

  function applySelection() {
    if (typeof ensureSelection !== 'function') {
      return;
    }
    const nextState = ensureSelection({ state, model });
    if (nextState && nextState !== state) {
      state = nextState;
    }
  }

  function render(nextModel = model, context = {}) {
    if (nextModel !== model) {
      model = nextModel || {};
    } else if (!nextModel) {
      model = {};
    }
    if (context.mount) {
      mount = context.mount;
    }
    if (context.page) {
      page = context.page;
    }
    if (typeof context.onRouteChange === 'function') {
      pathController.setListener(context.onRouteChange);
    }
    if (!context.skipEnsureSelection) {
      applySelection();
    }

    const urlPath = pathController.sync();

    if (!mount) {
      return deriveSummary(model, state, urlPath);
    }

    mount.innerHTML = '';

    if (!model.definition) {
      const lockedNode = renderLocked(model, state, api);
      if (lockedNode) {
        mount.appendChild(lockedNode);
      }
      return deriveSummary(model, state, urlPath);
    }

    const root = document.createElement('div');
    if (rootClassName) {
      root.className = rootClassName;
    }

    const headerNode = renderHeader(model, state, api);
    if (headerNode) {
      root.appendChild(headerNode);
    }

    const viewNode = renderCurrentView(model, state, api);
    if (viewNode) {
      root.appendChild(viewNode);
    }

    mount.appendChild(root);

    return deriveSummary(model, state, urlPath);
  }

  function setState(updater, options = {}) {
    const patch = typeof updater === 'function' ? updater(state) : updater;
    if (!patch || typeof patch !== 'object') {
      return state;
    }
    state = { ...state, ...patch };
    if (options.render !== false) {
      applySelection();
      render(model, { skipEnsureSelection: true });
    }
    return state;
  }

  const api = {
    render,
    setState,
    getState,
    getModel,
    getMount,
    getPage,
    getPath: () => pathController.getPath()
  };

  return api;
}

export default {
  createWorkspacePresenter
};
