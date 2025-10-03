const DEFAULT_SUMMARY = () => ({})

export function createSharedPresenter({ defaultState = {}, rootClassName = '' } = {}) {
  let state = { ...defaultState };
  let model = {};
  const context = {
    mount: null,
    page: null,
    definitions: undefined
  };

  const hooks = {
    deriveSummary: DEFAULT_SUMMARY
  };

  function cloneState() {
    return { ...state };
  }

  function assignContext(next = {}) {
    if (!next || typeof next !== 'object') return;
    if ('mount' in next && next.mount) {
      context.mount = next.mount;
    }
    if ('page' in next && next.page) {
      context.page = next.page;
    }
    if ('definitions' in next) {
      context.definitions = next.definitions;
    }
    if ('onRouteChange' in next) {
      context.onRouteChange = next.onRouteChange;
    }
  }

  function mergeState(partial, { replace = false } = {}) {
    if (!partial || typeof partial !== 'object') {
      return state;
    }
    state = replace ? { ...partial } : { ...state, ...partial };
    return state;
  }

  function runEnsureSelected() {
    if (typeof hooks.ensureSelectedVideo !== 'function') {
      return;
    }
    const nextState = hooks.ensureSelectedVideo({ ...state }, model, { ...context });
    if (nextState && typeof nextState === 'object') {
      mergeState(nextState, { replace: true });
    }
  }

  function getSummary() {
    if (typeof hooks.deriveSummary === 'function') {
      const summary = hooks.deriveSummary(model, cloneState(), { ...context });
      return summary || {};
    }
    return model?.summary || {};
  }

  function render(nextModel = {}, nextContext = {}) {
    model = nextModel || {};
    assignContext(nextContext);

    const mount = context.mount;
    if (!mount) {
      return getSummary();
    }

    if (!model.definition) {
      mount.innerHTML = '';
      const locked = typeof hooks.renderLockedState === 'function'
        ? hooks.renderLockedState(model.lock, cloneState(), { ...context })
        : null;
      if (locked) {
        mount.appendChild(locked);
      }
      return getSummary();
    }

    runEnsureSelected();

    mount.innerHTML = '';
    const root = document.createElement('div');
    if (rootClassName) {
      root.className = rootClassName;
    }

    const header = typeof hooks.renderHeader === 'function'
      ? hooks.renderHeader(model, cloneState(), { ...context })
      : null;
    if (header) {
      root.appendChild(header);
    }

    const view = typeof hooks.renderCurrentView === 'function'
      ? hooks.renderCurrentView(model, cloneState(), { ...context })
      : null;
    if (view) {
      root.appendChild(view);
    }

    mount.appendChild(root);

    if (typeof hooks.updateActiveTab === 'function') {
      hooks.updateActiveTab(root, cloneState(), { ...context });
    }

    return getSummary();
  }

  function updateState(updater, options = {}) {
    const { rerender = true, replace = false } = options;
    const next = typeof updater === 'function' ? updater(cloneState()) : updater;
    mergeState(next, { replace });
    if (rerender) {
      return render(model, context);
    }
    return state;
  }

  return {
    render,
    registerHooks(partial = {}) {
      if (!partial || typeof partial !== 'object') return;
      Object.assign(hooks, partial);
    },
    updateState,
    setState(next, options = {}) {
      return updateState(() => next, options);
    },
    getState: cloneState,
    getModel() {
      return model;
    },
    getContext() {
      return { ...context };
    },
    rerender() {
      return render(model, context);
    }
  };
}

export default { createSharedPresenter };
