import { ensureArray } from '../../../../core/helpers.js';
import { createAssetWorkspaceConfig } from './createAssetWorkspaceConfig.js';

const registry = new Map();

function createNavTheme(className, overrides = {}) {
  if (!className) {
    return { ...overrides };
  }
  const base = {
    nav: `${className}-nav`,
    button: `${className}-nav__button`,
    badge: `${className}-nav__badge`
  };
  return { ...base, ...overrides };
}

function ensureHelpersActions(helpers = {}) {
  return helpers?.actions || {};
}

export function registerAssetWorkspace(definition = {}) {
  const assetId = definition.assetId ?? definition.assetType;
  if (!assetId) {
    throw new Error('registerAssetWorkspace requires an assetId or assetType.');
  }
  const normalized = { ...definition, assetId };
  registry.set(assetId, normalized);
  return {
    assetId,
    createPresenter(overrides = {}) {
      return createAssetWorkspaceConfig({ ...normalized, ...overrides });
    }
  };
}

export function createActionDelegates(helpers = {}) {
  const actions = ensureHelpersActions(helpers);
  const quick = typeof actions.quickAction === 'function' ? actions.quickAction : () => {};
  const select = typeof actions.selectNiche === 'function' ? actions.selectNiche : () => {};
  const launch = typeof actions.launch === 'function' ? actions.launch : () => {};
  return {
    quickAction: quick,
    runAction: quick,
    selectNiche: select,
    launch
  };
}

export function createLaunchAction(options = {}) {
  const {
    launch: providedLaunch,
    helpers,
    label,
    className,
    icon,
    context,
    onBeforeLaunch,
    onLaunch
  } = options;

  const launch = providedLaunch ?? helpers?.getLaunch?.();
  if (!launch) {
    return null;
  }

  const resolvedLabel = launch.label || label || 'Launch';
  const disabled = Boolean(launch.disabled);
  const reasons = ensureArray(launch.availability?.reasons).filter(Boolean);

  const action = {
    label: resolvedLabel,
    className,
    disabled,
    ...(icon ? { icon } : {}),
    ...(reasons.length ? { title: reasons.join('\n') } : {})
  };

  action.onClick = async () => {
    if (disabled) {
      return;
    }
    const hookContext = { launch, helpers, context };
    if (typeof onBeforeLaunch === 'function') {
      const proceed = await onBeforeLaunch(hookContext);
      if (proceed === false) {
        return;
      }
    }
    if (typeof onLaunch === 'function') {
      const handled = await onLaunch(hookContext);
      if (handled === false || handled === true) {
        return;
      }
    }
    const launchHandler = ensureHelpersActions(helpers).launch;
    if (typeof launchHandler === 'function') {
      await launchHandler({ launch, context });
      return;
    }
    const handler = launch.onClick;
    if (typeof handler === 'function') {
      await handler();
    }
  };

  return action;
}

export function createLaunchButton(options = {}) {
  const { launch = {}, helpers, label, className, onBeforeLaunch, onLaunch } = options;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className || '';
  button.textContent = launch.label || label || 'Launch';
  button.disabled = Boolean(launch.disabled);
  const reasons = ensureArray(launch.availability?.reasons).filter(Boolean);
  if (reasons.length) {
    button.title = reasons.join('\n');
  }
  button.addEventListener('click', async () => {
    if (button.disabled) {
      return;
    }
    const hookContext = { launch, helpers };
    if (typeof onBeforeLaunch === 'function') {
      const proceed = await onBeforeLaunch(hookContext);
      if (proceed === false) {
        return;
      }
    }
    if (typeof onLaunch === 'function') {
      const handled = await onLaunch(hookContext);
      if (handled === false || handled === true) {
        return;
      }
    }
    const launchHandler = ensureHelpersActions(helpers).launch;
    if (typeof launchHandler === 'function') {
      await launchHandler({ launch });
      return;
    }
    launch.onClick?.();
  });
  return button;
}

export function withNavTheme(className, navConfig = {}) {
  if (navConfig === false) {
    return false;
  }
  if (typeof navConfig === 'function') {
    return context => withNavTheme(className, navConfig(context));
  }
  if (navConfig == null || navConfig === true) {
    return { theme: createNavTheme(className) };
  }
  const theme = createNavTheme(className, navConfig.theme || {});
  return { ...navConfig, theme };
}

export default {
  registerAssetWorkspace,
  createLaunchAction,
  createLaunchButton,
  createActionDelegates,
  withNavTheme
};
