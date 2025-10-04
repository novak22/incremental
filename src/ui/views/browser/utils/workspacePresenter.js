import { createWorkspacePathController } from './workspacePaths.js';

const noop = () => {};

function isObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function mergeSummary(summary, urlPath) {
  if (urlPath == null) {
    return summary;
  }
  const base = isObject(summary)
    ? summary
    : (summary == null ? {} : { summary });
  if (base.urlPath === urlPath) {
    return base;
  }
  return { ...base, urlPath };
}

function resolveLocked(model = {}, state = {}, options = {}) {
  if (typeof options.isLocked === 'function') {
    return Boolean(options.isLocked(model, state));
  }
  const lock = model?.lock;
  if (!lock) {
    return false;
  }
  if (lock.isUnlocked === true || lock.status === 'unlocked') {
    return false;
  }
  if (lock.isLocked != null) {
    return Boolean(lock.isLocked);
  }
  if (lock.active != null) {
    return Boolean(lock.active);
  }
  if (lock.status != null) {
    return lock.status !== 'available';
  }
  return true;
}

/**
 * Creates a presenter wrapper that centralizes workspace rendering concerns.
 *
 * The presenter caches mount, state, and page references so feature modules can
 * focus on their render logic while still providing consistent summary objects
 * and workspace path syncing behaviour.
 *
 * @param {Object} [options]
 * @param {Object} [options.state] - Initial reducer state for the workspace.
 * @param {Object} [options.model] - Initial model snapshot for the workspace.
 * @param {HTMLElement|null} [options.mount] - Optional mount cache.
 * @param {Object|null} [options.page] - Optional page metadata.
 * @param {(state: Object, model: Object) => void} [options.ensureSelection]
 *   Hook that can update the reducer state to guarantee a valid selection.
 * @param {(model: Object) => Object} [options.deriveSummary]
 *   Hook that maps a model to the summary returned to layout callers.
 * @param {(model: Object, mount: HTMLElement, context: Object) => void} [options.renderLocked]
 *   Hook that renders locked workspace messaging.
 * @param {(model: Object, mount: HTMLElement, context: Object) => void} [options.renderBody]
 *   Hook that renders the unlocked workspace content.
 * @param {(context: Object) => void} [options.beforeRender]
 *   Hook fired before rendering to build derived context (e.g. Learnly).
 * @param {(context: Object) => void} [options.afterRender]
 *   Hook fired after rendering to sync secondary UI (e.g. tabs).
 * @param {(state: Object, model: Object) => string} [options.derivePath]
 *   Optional hook to compute the workspace path.
 * @param {(path: string) => void} [options.onRouteChange]
 *   Optional listener invoked whenever the computed path changes.
 * @param {(model: Object, state: Object) => boolean} [options.isLocked]
 *   Optional override for determining when the workspace is locked.
 *
 * @example
 * const presenter = createWorkspacePresenter({
 *   ensureSelection(state, model) {
 *     if (!state.selectedId && Array.isArray(model.entries)) {
 *       state.selectedId = model.entries[0]?.id || null;
 *     }
 *   },
 *   deriveSummary(model) {
 *     return model.summary ?? {};
 *   },
 *   renderBody(model, mount) {
 *     mount.textContent = model.content;
 *   }
 * });
 *
 * presenter.render({ content: 'Hello!' }, { mount: document.body });
 * @returns {Object} presenter API with render helpers and state accessors.
 */
export function createWorkspacePresenter(options = {}) {
  const {
    ensureSelection = noop,
    deriveSummary,
    renderLocked = noop,
    renderBody = noop,
    beforeRender = noop,
    afterRender = noop,
    derivePath,
    onRouteChange,
    isLocked
  } = options;

  let currentState = isObject(options.state) ? { ...options.state } : {};
  let currentModel = isObject(options.model) ? { ...options.model } : options.model || {};
  let currentMount = options.mount ?? null;
  let currentPage = options.page ?? null;
  let routeListener = typeof onRouteChange === 'function' ? onRouteChange : null;

  const pathController = typeof derivePath === 'function'
    ? createWorkspacePathController({
      derivePath: () => derivePath(currentState, currentModel)
    })
    : null;

  if (pathController && routeListener) {
    pathController.setListener(routeListener);
  }

  function getState() {
    return currentState;
  }

  function setState(nextState = {}) {
    currentState = isObject(nextState) ? nextState : {};
    return currentState;
  }

  function updateState(updater) {
    if (typeof updater === 'function') {
      const draft = updater({ ...currentState });
      currentState = isObject(draft) ? draft : currentState;
      return currentState;
    }
    if (isObject(updater)) {
      currentState = { ...currentState, ...updater };
    }
    return currentState;
  }

  function getModel() {
    return currentModel;
  }

  function setMount(nextMount = null) {
    currentMount = nextMount || null;
    return currentMount;
  }

  function getMount() {
    return currentMount;
  }

  function setPage(nextPage = null) {
    currentPage = nextPage || null;
    return currentPage;
  }

  function getPage() {
    return currentPage;
  }

  function setRouteChangeListener(listener) {
    routeListener = typeof listener === 'function' ? listener : null;
    if (pathController) {
      pathController.setListener(routeListener);
    }
  }

  function render(nextModel = {}, context = {}) {
    currentModel = isObject(nextModel) ? nextModel : {};

    if (context.state) {
      setState(context.state);
    }

    if ('mount' in context) {
      setMount(context.mount);
    }

    if ('page' in context) {
      setPage(context.page);
    }

    if (context.onRouteChange) {
      setRouteChangeListener(context.onRouteChange);
    }

    const renderContext = {
      model: currentModel,
      state: currentState,
      mount: currentMount,
      page: currentPage,
      headless: !currentMount || context.headless === true,
      force: Boolean(context.force),
      locked: false,
      rendered: false,
      summary: null,
      urlPath: null,
      pathController
    };

    if (typeof beforeRender === 'function') {
      beforeRender(renderContext);
    }

    ensureSelection(currentState, currentModel);

    if (pathController) {
      const synced = pathController.sync({ force: Boolean(context.forcePathSync) });
      renderContext.urlPath = synced;
    }

    renderContext.locked = resolveLocked(currentModel, currentState, { isLocked });

    if (!renderContext.headless) {
      const target = currentMount;
      if (renderContext.locked) {
        renderLocked(currentModel, target, renderContext);
        renderContext.rendered = true;
      } else {
        renderBody(currentModel, target, renderContext);
        renderContext.rendered = true;
      }
    }

    const summary = typeof deriveSummary === 'function'
      ? deriveSummary(currentModel)
      : (isObject(currentModel.summary) ? currentModel.summary : {});

    renderContext.summary = summary;

    if (typeof afterRender === 'function') {
      afterRender(renderContext);
    }

    const returnUrlPath = renderContext.urlPath ?? pathController?.getPath();

    if (renderContext.headless) {
      return mergeSummary(summary, returnUrlPath);
    }

    return mergeSummary(summary, returnUrlPath);
  }

  return {
    render,
    getState,
    setState,
    updateState,
    getModel,
    getMount,
    setMount,
    getPage,
    setPage,
    setRouteChangeListener
  };
}

export default {
  createWorkspacePresenter
};
