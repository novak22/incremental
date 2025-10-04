import { createConfiguredAssetWorkspace } from './createConfiguredAssetWorkspace.js';

function normalizeLockConfig(lock = null, className) {
  if (!lock) {
    return undefined;
  }
  if (typeof lock === 'string') {
    return {
      theme: {
        container: className,
        locked: `${className}--locked`,
        message: `${className}-empty`,
        label: 'This workspace'
      },
      fallbackMessage: lock
    };
  }
  if (typeof lock !== 'object') {
    return undefined;
  }

  const baseTheme = {
    container: className,
    locked: `${className}--locked`,
    message: `${className}-empty`,
    label: 'This workspace'
  };
  const theme = {
    ...baseTheme,
    ...(lock.container ? { container: lock.container } : {}),
    ...(lock.locked ? { locked: lock.locked } : {}),
    ...(lock.message ? { message: lock.message } : {}),
    ...(lock.label ? { label: lock.label } : {}),
    ...(lock.theme || {})
  };

  return {
    theme,
    fallbackMessage: lock.fallbackMessage ?? lock.fallback ?? lock.messageFallback
  };
}

function createHeaderRenderer(header, options = {}) {
  if (typeof header === 'function') {
    return header;
  }
  if (header && typeof header === 'object') {
    const { create, createHeader, createRender, render } = header;
    const factory = createHeader || createRender || create;
    if (typeof factory === 'function') {
      const produced = factory({ header, options });
      if (typeof produced === 'function') {
        return produced;
      }
    }
    if (typeof render === 'function') {
      return render;
    }
    return () => ({ ...header });
  }
  return undefined;
}

function createOverrideConfig(actions = {}, overrides = {}) {
  const normalized = { ...(overrides || {}) };
  if (typeof actions.performQualityAction === 'function' && normalized.performQualityAction == null) {
    normalized.performQualityAction = actions.performQualityAction;
  }
  if (typeof actions.selectAssetNiche === 'function' && normalized.selectAssetNiche == null) {
    normalized.selectAssetNiche = actions.selectAssetNiche;
  }
  if (typeof actions.selectNiche === 'function' && normalized.selectNiche == null && normalized.selectAssetNiche == null) {
    normalized.selectNiche = actions.selectNiche;
  }
  if (typeof actions.launch === 'function' && normalized.launch == null) {
    normalized.launch = actions.launch;
  }
  return normalized;
}

export function createAssetWorkspaceConfig(options = {}) {
  const {
    className,
    header,
    lock,
    actions,
    overrides,
    hooks = {},
    ...rest
  } = options;

  const headerRenderer = createHeaderRenderer(header, { className });
  const lockConfig = normalizeLockConfig(lock, className);
  const overrideConfig = createOverrideConfig(actions, overrides);
  const {
    beforeRender,
    afterRender,
    syncNavigation,
    onViewChange
  } = hooks;

  return createConfiguredAssetWorkspace({
    ...rest,
    className,
    ...(headerRenderer ? { header: headerRenderer } : {}),
    ...(lockConfig ? { lock: lockConfig } : {}),
    overrides: overrideConfig,
    beforeRender,
    afterRender,
    syncNavigation,
    onViewChange
  });
}

export default {
  createAssetWorkspaceConfig
};
