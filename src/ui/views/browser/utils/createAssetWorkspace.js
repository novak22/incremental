import { createTabbedWorkspacePresenter } from './createTabbedWorkspacePresenter.js';
import { renderWorkspaceHeader } from '../components/common/renderWorkspaceHeader.js';
import { renderKpiGrid } from '../components/common/renderKpiGrid.js';
import { renderInstanceTable } from '../components/common/renderInstanceTable.js';
import { renderDetailPanel } from '../components/common/renderDetailPanel.js';
import { appendContent } from '../components/common/domHelpers.js';

function ensureArray(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function toMap(items = []) {
  const map = new Map();
  items.forEach(item => {
    if (item && item.id != null) {
      map.set(item.id, item);
    }
  });
  return map;
}

function buildNavButtons(views, state, model, context, resolveView) {
  return views
    .filter(view => view && view.hide !== true)
    .map(view => {
      const badge = typeof view.badge === 'function'
        ? view.badge({ model, state, view, context })
        : view.badge;
      const label = typeof view.label === 'function'
        ? view.label({ model, state, view, context })
        : (view.label || view.id);
      const targetView = view.id;
      return {
        label,
        view: targetView,
        badge,
        isActive: resolveView(state.view) === targetView
      };
    });
}

function normalizeNavConfig(navConfig, options) {
  if (!navConfig) {
    return null;
  }
  if (typeof HTMLElement !== 'undefined' && navConfig instanceof HTMLElement) {
    return navConfig;
  }
  const { buttons = [], onSelect, theme } = navConfig;
  const config = {
    navClassName: theme?.nav,
    buttonClassName: theme?.button,
    badgeClassName: theme?.badge,
    datasetKey: 'view',
    withAriaPressed: true,
    ...navConfig,
    buttons,
    onSelect
  };
  if (typeof config.onSelect !== 'function') {
    config.onSelect = options.setView;
  }
  config.buttons = buttons.map(button => ({
    ...button,
    onSelect: config.onSelect
  }));
  return config;
}

function createSharedContext(presenter, helpers) {
  return {
    get model() {
      return presenter.getModel();
    },
    get state() {
      return presenter.getState();
    },
    presenter,
    ...helpers
  };
}

function renderSections(sections = [], context) {
  const fragment = document.createDocumentFragment();
  ensureArray(sections).forEach(section => {
    if (!section) return;
    switch (section.type) {
      case 'kpis':
        fragment.appendChild(renderKpiGrid(section.options || section));
        break;
      case 'table':
        fragment.appendChild(renderInstanceTable(section.options || section));
        break;
      case 'detail':
        fragment.appendChild(renderDetailPanel({ ...section.options, context }));
        break;
      default:
        appendContent(fragment, section.content ?? section);
    }
  });
  return fragment;
}

export function createAssetWorkspacePresenter(config = {}) {
  const {
    className = 'asset-workspace',
    state: initialState = {},
    defaultView,
    views = [],
    header,
    ensureSelection,
    deriveSummary,
    derivePath,
    renderLocked,
    beforeRender,
    afterRender,
    isLocked,
    syncNavigation,
    onViewChange
  } = config;

  if (!Array.isArray(views) || views.length === 0) {
    throw new Error('createAssetWorkspacePresenter requires at least one view definition.');
  }

  const viewMap = toMap(views);
  if (viewMap.size === 0) {
    throw new Error('createAssetWorkspacePresenter requires view definitions with an id property.');
  }

  const fallbackView = viewMap.has(defaultView) ? defaultView : views[0].id;

  function resolveView(viewId) {
    return viewMap.has(viewId) ? viewId : fallbackView;
  }

  const presenter = createTabbedWorkspacePresenter({
    className,
    state: { ...initialState, view: resolveView(initialState.view) },
    ensureSelection(state, model) {
      if (!viewMap.has(state.view)) {
        state.view = fallbackView;
      }
      if (typeof ensureSelection === 'function') {
        ensureSelection(state, model);
      }
    },
    deriveSummary,
    derivePath,
    renderLocked,
    beforeRender,
    afterRender(context) {
      if (typeof afterRender === 'function') {
        afterRender({ ...context, setView });
      }
    },
    isLocked,
    syncNavigation(context) {
      if (!context?.mount) return;
      const activeView = resolveView(context.state?.view);
      context.mount.querySelectorAll('[data-view]').forEach(button => {
        const isActive = resolveView(button.dataset.view) === activeView;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
      if (typeof syncNavigation === 'function') {
        syncNavigation({ ...context, setView });
      }
    },
    renderHeader(model, state, context) {
      if (header === false) {
        return null;
      }
      const sharedContext = createSharedContext(presenter, { setView, updateState, refresh });
      const headerInput = typeof header === 'function'
        ? header(model, state, sharedContext)
        : header || {};
      if (!headerInput) {
        return null;
      }
      let navConfig = headerInput.nav;
      if (navConfig !== false) {
        const buttons = Array.isArray(navConfig?.buttons) && navConfig.buttons.length
          ? navConfig.buttons
          : buildNavButtons(views, state, model, sharedContext, resolveView);
        navConfig = normalizeNavConfig({ ...navConfig, buttons }, { setView });
      }
      const actions = typeof headerInput.actions === 'function'
        ? headerInput.actions(sharedContext)
        : headerInput.actions;
      const badges = typeof headerInput.badges === 'function'
        ? headerInput.badges(sharedContext)
        : headerInput.badges;
      return renderWorkspaceHeader({
        ...headerInput,
        nav: navConfig,
        actions,
        badges
      });
    },
    renderViews(model, state, context) {
      const sharedContext = createSharedContext(presenter, { setView, updateState, refresh });
      const activeView = viewMap.get(resolveView(state.view));
      if (!activeView) {
        return null;
      }
      const viewContext = {
        model,
        state,
        presenter,
        setView,
        updateState,
        refresh,
        renderKpiGrid,
        renderInstanceTable,
        renderDetailPanel,
        context: sharedContext
      };
      if (typeof activeView.render === 'function') {
        return activeView.render(viewContext);
      }
      if (activeView.sections) {
        return renderSections(activeView.sections, sharedContext);
      }
      return null;
    }
  });

  function refresh(model = presenter.getModel()) {
    presenter.render(model, { mount: presenter.getMount() });
  }

  function updateState(updater, { rerender = true } = {}) {
    presenter.updateState(updater);
    if (rerender) {
      refresh();
    }
  }

  function setView(viewId, { rerender = true } = {}) {
    const previous = presenter.getState();
    const target = resolveView(viewId);
    presenter.updateState(state => ({ ...state, view: target }));
    const nextState = presenter.getState();
    if (typeof onViewChange === 'function') {
      onViewChange(target, {
        previousView: previous?.view,
        state: nextState,
        model: presenter.getModel(),
        setView,
        refresh,
        updateState
      });
    }
    if (rerender) {
      refresh();
    }
  }

  return {
    ...presenter,
    setView,
    refresh,
    updateAndRender: updateState
  };
}

export default {
  createAssetWorkspacePresenter
};
