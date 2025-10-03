const EMPTY_OBJECT = {};

function toObject(value) {
  return value && typeof value === 'object' ? value : EMPTY_OBJECT;
}

export function createWorkspacePresenter({
  rootClassName = '',
  getInitialState = () => EMPTY_OBJECT,
  ensureSelected,
  renderLockedState,
  renderHeader,
  renderMetrics,
  renderNav,
  renderBody,
  deriveSummary
} = {}) {
  let state = toObject(getInitialState?.()) || {};
  let model = {};
  let mount = null;
  let page = null;

  let api = null;

  function normalizeState(nextState, previousState = state) {
    let result = toObject(nextState);
    if (result === EMPTY_OBJECT) {
      result = {};
    }
    if (typeof ensureSelected === 'function') {
      const ensured = ensureSelected(result, model, {
        previousState,
        presenter: api
      });
      if (ensured && typeof ensured === 'object') {
        result = ensured;
      }
    }
    return result;
  }

  function renderSections() {
    if (!mount) return;

    mount.innerHTML = '';

    if (!model?.definition) {
      if (typeof renderLockedState === 'function') {
        const locked = renderLockedState(model?.lock, { state, model, presenter: api });
        if (locked) {
          mount.appendChild(locked);
        }
      }
      return;
    }

    const root = document.createElement('div');
    if (rootClassName) {
      root.className = rootClassName;
    }

    const sections = [
      typeof renderHeader === 'function' ? renderHeader(model, { state, presenter: api }) : null,
      typeof renderMetrics === 'function' ? renderMetrics(model, { state, presenter: api }) : null,
      typeof renderNav === 'function' ? renderNav(model, { state, presenter: api }) : null,
      typeof renderBody === 'function' ? renderBody(model, { state, presenter: api }) : null
    ].filter(Boolean);

    if (sections.length) {
      root.append(...sections);
    }

    mount.appendChild(root);
  }

  function deriveSummaryResult() {
    if (typeof deriveSummary === 'function') {
      const summary = deriveSummary({ state, model, presenter: api });
      if (summary && typeof summary === 'object') {
        return summary;
      }
    }
    return {};
  }

  function setState(updater) {
    const base = typeof updater === 'function' ? updater({ ...state }) : { ...state, ...toObject(updater) };
    state = normalizeState(base, state);
    renderSections();
    return state;
  }

  function render(nextModel = {}, options = {}) {
    model = nextModel || {};
    if (options.mount) {
      mount = options.mount;
    }
    if (Object.prototype.hasOwnProperty.call(options, 'page')) {
      page = options.page;
    }
    state = normalizeState(state, state);
    renderSections();
    return deriveSummaryResult();
  }

  api = {
    render,
    setState,
    getState: () => state,
    getModel: () => model,
    getMount: () => mount,
    getPage: () => page,
    forceRender: () => {
      state = normalizeState(state, state);
      renderSections();
    }
  };

  return api;
}

export default {
  createWorkspacePresenter
};
