import { getElement } from '../../elements/registry.js';
import { getState } from '../../../core/state.js';
import notificationsPresenter from './notificationsPresenter.js';
import { buildActionQueue } from '../../actions/registry.js';
import {
  getWidgetDefinitions,
  getWidgetRegistryVersion
} from './widgets/registry.js';

const widgetControllers = new Map();
const widgetMounts = new Map();
const knownWidgetDefinitions = new Map();
let knownRegistryVersion = -1;

function getWidgetMounts() {
  const mounts = getElement('homepageWidgets');
  if (!mounts || typeof mounts !== 'object') {
    return null;
  }
  return mounts;
}

function resolveWidgetContainer(mounts, widgetId) {
  if (!mounts || !widgetId) return null;

  if (typeof mounts.getWidgetContainer === 'function') {
    const container = mounts.getWidgetContainer(widgetId);
    if (container) {
      return container;
    }
  }

  if (typeof mounts.getWidgetContainers === 'function') {
    const containers = mounts.getWidgetContainers();
    if (Array.isArray(containers)) {
      const found = containers.find(node => node?.dataset?.widget === widgetId);
      if (found) {
        return found;
      }
    }
  }

  if (mounts.container?.querySelectorAll) {
    const nodes = mounts.container.querySelectorAll('[data-widget]');
    for (const node of nodes) {
      if (node?.dataset?.widget === widgetId) {
        return node;
      }
    }
  }

  const legacy = mounts[widgetId];
  if (legacy) {
    if (legacy.container) {
      return legacy.container;
    }
    return legacy;
  }

  return null;
}

function destroyController(id, controller) {
  if (!controller) return;
  if (typeof controller.destroy === 'function') {
    try {
      controller.destroy();
    } catch (error) {
      // Swallow teardown errors to avoid breaking shutdown flows.
    }
  }
  knownWidgetDefinitions.delete(id);
  widgetMounts.delete(id);
}

function mountWidgetController(id, controller, mounts) {
  if (!controller) {
    return false;
  }

  const container = resolveWidgetContainer(mounts, id);
  if (!container) {
    widgetMounts.delete(id);
    return false;
  }

  const previous = widgetMounts.get(id);
  if (previous?.container === container && typeof controller.isMounted === 'function') {
    if (controller.isMounted()) {
      return true;
    }
  }

  try {
    if (typeof controller.mount === 'function') {
      controller.mount({ container });
    } else if (typeof controller.init === 'function') {
      controller.init({ container });
    }
  } catch (error) {
    return false;
  }

  if (typeof controller.isMounted === 'function' && !controller.isMounted()) {
    return false;
  }

  widgetMounts.set(id, { container });
  return true;
}

function ensureWidgetControllers() {
  const mounts = getWidgetMounts();
  const definitions = getWidgetDefinitions();
  const registryVersion = getWidgetRegistryVersion();

  const registryUpdated = registryVersion !== knownRegistryVersion;

  if (registryUpdated) {
    const validIds = new Set(definitions.map(definition => definition.id));

    for (const [id, controller] of widgetControllers.entries()) {
      if (!validIds.has(id)) {
        destroyController(id, controller);
        widgetControllers.delete(id);
      }
    }

    for (const definition of definitions) {
      if (!widgetControllers.has(definition.id)) {
        continue;
      }
      const cached = knownWidgetDefinitions.get(definition.id);
      const definitionChanged =
        !cached ||
        cached.factory !== definition.factory ||
        cached.fallbackFactory !== definition.fallbackFactory;
      if (definitionChanged) {
        const controller = widgetControllers.get(definition.id);
        destroyController(definition.id, controller);
        widgetControllers.delete(definition.id);
      }
    }
  }

  for (const definition of definitions) {
    if (widgetControllers.has(definition.id)) {
      continue;
    }
    let controller = null;
    try {
      controller = definition.factory();
    } catch (error) {
      controller = null;
    }
    if (!controller && typeof definition.fallbackFactory === 'function') {
      try {
        controller = definition.fallbackFactory();
      } catch (error) {
        controller = null;
      }
    }
    if (controller) {
      widgetControllers.set(definition.id, controller);
      knownWidgetDefinitions.set(definition.id, {
        factory: definition.factory,
        fallbackFactory: definition.fallbackFactory
      });
    }
  }

  if (registryUpdated) {
    knownRegistryVersion = registryVersion;
  }

  if (!mounts) {
    return;
  }

  for (const definition of definitions) {
    const controller = widgetControllers.get(definition.id);
    if (!controller) continue;
    mountWidgetController(definition.id, controller, mounts);
  }
}

function getWidgetController(widgetId) {
  if (!widgetId) return null;
  ensureWidgetControllers();
  const controller = widgetControllers.get(widgetId) || null;
  if (!controller) {
    return null;
  }
  if (!widgetMounts.has(widgetId) && typeof controller.isMounted === 'function') {
    if (!controller.isMounted()) {
      return null;
    }
  }
  return controller;
}

function renderTodo(state, summary = {}) {
  const widget = getWidgetController('todo');
  if (!widget) return;
  const resolvedState = state || getState() || {};
  const model = buildActionQueue({ state: resolvedState, summary });
  if (typeof widget.render === 'function') {
    widget.render(model);
  }
}

function renderApps(context = {}) {
  const widget = getWidgetController('apps');
  if (typeof widget?.render === 'function') {
    widget.render(context);
  }
}

function renderBank(context = {}) {
  const widget = getWidgetController('bank');
  if (typeof widget?.render === 'function') {
    widget.render(context);
  }
}

function renderDashboard(viewModel = {}, context = {}) {
  if (!viewModel) return;
  notificationsPresenter.render(viewModel.eventLog || {});
  renderTodo(context?.state, context?.summary || {});
  renderApps(context);
  renderBank(context);
}

function resetForTests() {
  for (const [id, controller] of widgetControllers.entries()) {
    destroyController(id, controller);
  }
  widgetControllers.clear();
  widgetMounts.clear();
  knownWidgetDefinitions.clear();
  knownRegistryVersion = -1;
}

const __testables = {
  reset: resetForTests,
  hasController(id) {
    return widgetControllers.has(id);
  }
};

export default {
  renderDashboard
};

export {
  renderTodo,
  __testables
};
