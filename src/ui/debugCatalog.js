import { buildDebugCatalogViewModel } from './debugCatalog/model.js';
import { getActiveView } from './viewManager.js';
import classicDebugCatalogPresenter from './views/classic/debugCatalogPresenter.js';

let debugEnabled = false;
let activePresenter = null;

export const noopDebugCatalogPresenter = Object.freeze({
  show() {},
  hide() {},
  render() {}
});

function shouldEnableDebugPanel() {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('debugActions') === '1') {
      window.localStorage.setItem('debugActions', 'true');
      return true;
    }
    if (url.hash.includes('debug-actions')) {
      return true;
    }
    return window.localStorage.getItem('debugActions') === 'true';
  } catch (error) {
    return false;
  }
}

function persistDebugFlag(value) {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      window.localStorage.setItem('debugActions', 'true');
    } else {
      window.localStorage.removeItem('debugActions');
    }
  } catch (error) {
    // ignore storage errors
  }
}

function resolvePresenter() {
  const activeView = getActiveView();
  if (activeView?.presenters && Object.prototype.hasOwnProperty.call(activeView.presenters, 'debugCatalog')) {
    return activeView.presenters.debugCatalog || null;
  }
  return classicDebugCatalogPresenter;
}

function usePresenter(presenter, { show = false } = {}) {
  if (!presenter) {
    if (activePresenter) {
      activePresenter.hide?.();
      activePresenter = null;
    }
    return null;
  }

  if (activePresenter && activePresenter !== presenter) {
    activePresenter.hide?.();
  }

  activePresenter = presenter;

  if (show) {
    presenter.show?.();
  }

  return presenter;
}

function renderCatalog(presenter) {
  if (!presenter) return;
  usePresenter(presenter, { show: true });
  const viewModel = buildDebugCatalogViewModel();
  presenter.render?.(viewModel);
}

function enableDebugPanel() {
  const presenter = resolvePresenter();
  if (!presenter) {
    debugEnabled = false;
    usePresenter(null);
    return;
  }

  debugEnabled = true;
  persistDebugFlag(true);
  renderCatalog(presenter);
}

function disableDebugPanel() {
  persistDebugFlag(false);
  debugEnabled = false;
  usePresenter(null);
}

export function initActionCatalogDebug() {
  if (typeof window !== 'undefined') {
    window.debugActions = {
      enable: enableDebugPanel,
      disable: disableDebugPanel,
      refresh: refreshActionCatalogDebug
    };
  }

  if (shouldEnableDebugPanel()) {
    enableDebugPanel();
  }
}

export function refreshActionCatalogDebug() {
  if (!debugEnabled) return;
  const presenter = resolvePresenter();
  if (!presenter) {
    usePresenter(null);
    return;
  }
  renderCatalog(presenter);
}

export default {
  initActionCatalogDebug,
  refreshActionCatalogDebug,
  noopDebugCatalogPresenter
};
