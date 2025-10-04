import { createAssetWorkspacePresenter } from './createAssetWorkspace.js';
import { renderWorkspaceLock } from '../components/common/renderWorkspaceLock.js';
import { performQualityAction as defaultPerformQualityAction } from '../../../../game/assets/index.js';

function noop() {}

function defaultIsLocked(model = {}) {
  return !model?.definition;
}

function coerceBadge(value) {
  if (value == null || value === false) {
    return null;
  }
  if (typeof value === 'number') {
    return value === 0 ? null : value;
  }
  if (typeof value === 'string') {
    return value.length ? value : null;
  }
  return value;
}

function resolvePath(source, segments = []) {
  return segments.reduce((value, segment) => (value == null ? value : value[segment]), source);
}

function createBadgeResolver(badge) {
  if (badge == null) {
    return undefined;
  }
  if (typeof badge === 'function') {
    return args => coerceBadge(badge(args));
  }
  if (typeof badge === 'string') {
    const [first, ...rest] = badge.split('.');
    return ({ model, state }) => {
      let root;
      switch (first) {
        case 'model':
          root = model;
          break;
        case 'state':
          root = state;
          break;
        case 'summary':
          root = model?.summary;
          break;
        default:
          root = model?.summary;
          return coerceBadge(resolvePath(root, [first, ...rest]));
      }
      return coerceBadge(resolvePath(root, rest));
    };
  }
  if (typeof badge === 'object') {
    if (badge.summary) {
      return createBadgeResolver(`summary.${badge.summary}`);
    }
    if (badge.model) {
      return createBadgeResolver(`model.${badge.model}`);
    }
    if (badge.state) {
      return createBadgeResolver(`state.${badge.state}`);
    }
  }
  return () => coerceBadge(badge);
}

function createLockRenderer(lockConfig = {}) {
  if (!lockConfig || typeof lockConfig !== 'object') {
    return undefined;
  }
  const { theme, fallbackMessage } = lockConfig;
  return (model = {}, mount) => {
    if (!mount) return;
    mount.innerHTML = '';
    mount.appendChild(
      renderWorkspaceLock({
        theme,
        lock: model.lock,
        fallbackMessage
      })
    );
  };
}

function createViewRenderer(viewDefinition = {}, helpers) {
  const { render, create, createView, createRender } = viewDefinition;
  const factory = createRender || createView || create;
  if (typeof factory === 'function') {
    const produced = factory({ ...helpers, view: viewDefinition });
    if (typeof produced === 'function') {
      return context => produced({ ...context, helpers });
    }
  }
  if (typeof render === 'function') {
    return context => render({ ...context, helpers });
  }
  return undefined;
}

export function createConfiguredAssetWorkspace(config = {}) {
  const {
    assetType,
    assetId = assetType,
    className,
    defaultView,
    state = {},
    ensureSelection,
    deriveSummary,
    derivePath,
    renderLocked,
    lock,
    header,
    views = [],
    overrides = {},
    isLocked = defaultIsLocked,
    beforeRender,
    afterRender,
    syncNavigation,
    onViewChange
  } = config;

  const performQualityAction = overrides.performQualityAction ?? defaultPerformQualityAction ?? noop;
  const selectNiche = overrides.selectNiche ?? overrides.selectAssetNiche ?? noop;

  const assetKey = assetId ?? assetType;

  const quickAction = (instanceId, actionId) => {
    if (!assetKey || !instanceId || !actionId) return;
    performQualityAction(assetKey, instanceId, actionId);
  };

  const nicheSelect = (instanceId, value) => {
    if (!assetKey || !instanceId || value == null || typeof selectNiche !== 'function') return;
    selectNiche(assetKey, instanceId, value);
  };

  let presenter;

  const helpers = {
    assetType: assetKey,
    actions: {
      quickAction,
      selectNiche: typeof selectNiche === 'function' ? nicheSelect : noop
    },
    getPresenter: () => presenter
  };

  const normalizedViews = views.map(view => {
    const normalized = { ...view };
    if (view.badge !== undefined) {
      normalized.badge = createBadgeResolver(view.badge);
    }
    const renderer = createViewRenderer(view, helpers);
    if (renderer) {
      normalized.render = renderer;
    }
    return normalized;
  });

  presenter = createAssetWorkspacePresenter({
    className,
    defaultView,
    state,
    ensureSelection,
    deriveSummary,
    derivePath,
    renderLocked: typeof renderLocked === 'function' ? renderLocked : createLockRenderer(lock),
    header,
    isLocked,
    views: normalizedViews,
    beforeRender,
    afterRender,
    syncNavigation,
    onViewChange
  });

  return presenter;
}

export default {
  createConfiguredAssetWorkspace
};
