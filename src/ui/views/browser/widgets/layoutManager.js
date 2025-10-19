import { getElement } from '../../../elements/registry.js';
import {
  getWidgetDefinitions,
  getWidgetDefinition,
  getWidgetRegistryVersion
} from './registry.js';
import {
  loadLayoutOrder,
  persistLayoutOrder,
  getOrderedWidgetIds
} from './userLayoutStorage.js';

function getMountContainer(record) {
  if (!record) return null;
  return record.container || null;
}

function listTemplates(record) {
  if (!record) return [];
  if (typeof record.listTemplates === 'function') {
    return record.listTemplates() || [];
  }
  const container = getMountContainer(record);
  if (!container?.querySelectorAll) {
    return [];
  }
  return Array.from(container.querySelectorAll('template[data-widget-template]'));
}

function getTemplate(record, widgetId) {
  if (!record || !widgetId) return null;
  if (typeof record.getTemplate === 'function') {
    const template = record.getTemplate(widgetId);
    if (template) {
      return template;
    }
  }
  const container = getMountContainer(record);
  if (!container?.querySelector) {
    return null;
  }
  return container.querySelector(`template[data-widget-template="${widgetId}"]`);
}

function collectExistingNodes(container) {
  const nodes = new Map();
  if (!container) {
    return nodes;
  }
  const children = container.children || [];
  for (const child of children) {
    const widgetId = child?.dataset?.widget;
    if (widgetId) {
      nodes.set(widgetId, child);
    }
  }
  return nodes;
}

function instantiateFromTemplate(record, widgetId, ownerDocument) {
  const template = getTemplate(record, widgetId);
  if (!template) {
    return null;
  }
  let fragment = null;
  if ('content' in template) {
    fragment = template.content.cloneNode(true);
  } else {
    const doc = ownerDocument || template.ownerDocument || (typeof document !== 'undefined' ? document : null);
    fragment = doc ? doc.createDocumentFragment() : null;
    if (fragment) {
      fragment.appendChild(template.cloneNode(true));
    }
  }
  if (!fragment) {
    return null;
  }
  const nodes = Array.from(fragment.childNodes || []);
  const elementType = typeof Node !== 'undefined' ? Node.ELEMENT_NODE : 1;
  for (const node of nodes) {
    if (node?.nodeType === elementType) {
      return node;
    }
  }
  return null;
}

function createWidgetNode(record, definition, ownerDocument) {
  const container = ownerDocument || (typeof document !== 'undefined' ? document : null);
  const cloned = instantiateFromTemplate(record, definition.id, container);
  if (cloned) {
    cloned.setAttribute('data-widget', definition.id);
    if (!cloned.classList?.contains('browser-widget')) {
      cloned.classList?.add('browser-widget');
    }
    return cloned;
  }

  const doc = container || (typeof document !== 'undefined' ? document : null);
  if (!doc) {
    return null;
  }
  const section = doc.createElement('section');
  section.className = 'browser-widget';
  section.setAttribute('data-widget', definition.id);
  return section;
}

function mountWidgetController(id, controller, container) {
  if (!controller || !container) {
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
    widgetMounts.delete(id);
    return false;
  }

  if (typeof controller.isMounted === 'function' && !controller.isMounted()) {
    widgetMounts.delete(id);
    return false;
  }

  widgetMounts.set(id, { container });
  return true;
}

function defaultResolveMountRecord() {
  const record = getElement('homepageWidgets');
  if (!record) {
    return null;
  }
  if (record.container) {
    return record;
  }
  return { container: record };
}

function createLayoutManager({
  resolveMountRecord = defaultResolveMountRecord,
  getDefinitions = getWidgetDefinitions,
  getDefinition = getWidgetDefinition,
  getRegistryVersion = getWidgetRegistryVersion,
  loadOrder = loadLayoutOrder,
  persistOrder = persistLayoutOrder,
  storageKey
} = {}) {
  const widgetControllers = new Map();
  const widgetMounts = new Map();
  const knownWidgetDefinitions = new Map();
  let knownRegistryVersion = -1;
  let activeContainer = null;
  let currentLayoutOrder = [];

  function mountWidgetController(id, controller, container) {
    if (!controller || !container) {
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
      widgetMounts.delete(id);
      return false;
    }

    if (typeof controller.isMounted === 'function' && !controller.isMounted()) {
      widgetMounts.delete(id);
      return false;
    }

    widgetMounts.set(id, { container });
    return true;
  }

  function destroyControllerRecord(id, record) {
    const controller = record?.controller;
    if (!controller) {
      widgetMounts.delete(id);
      knownWidgetDefinitions.delete(id);
      return;
    }
    try {
      if (typeof controller.destroy === 'function') {
        controller.destroy();
      }
    } catch (error) {
      // Ignore teardown errors to keep shutdown resilient.
    }
    widgetMounts.delete(id);
    knownWidgetDefinitions.delete(id);
  }

  function instantiateController(definition) {
    if (!definition) {
      return null;
    }

    const record = {
      controller: null
    };

    try {
      record.controller = definition.factory();
    } catch (error) {
      record.controller = null;
    }

    if (!record.controller && typeof definition.fallbackFactory === 'function') {
      try {
        record.controller = definition.fallbackFactory();
      } catch (error) {
        record.controller = null;
      }
    }

    if (!record.controller) {
      return null;
    }

    return record;
  }

  function ensureWidgetControllers(definitions) {
    const registryVersion = getRegistryVersion();
    const registryUpdated = registryVersion !== knownRegistryVersion;

    if (registryUpdated) {
      const validIds = new Set(definitions.map(definition => definition.id));

      for (const [id, record] of widgetControllers.entries()) {
        if (!validIds.has(id)) {
          destroyControllerRecord(id, record);
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
          const record = widgetControllers.get(definition.id);
          destroyControllerRecord(definition.id, record);
          widgetControllers.delete(definition.id);
        }
      }
    }

    for (const definition of definitions) {
      if (widgetControllers.has(definition.id)) {
        continue;
      }
      const record = instantiateController(definition);
      if (record) {
        widgetControllers.set(definition.id, record);
        knownWidgetDefinitions.set(definition.id, {
          factory: definition.factory,
          fallbackFactory: definition.fallbackFactory
        });
      }
    }

    if (registryUpdated) {
      knownRegistryVersion = registryVersion;
    }
  }

  function resolveLayoutOrder(definitions) {
    const storedOrder = loadOrder(storageKey);
    const availableIds = definitions.map(definition => definition.id);
    return getOrderedWidgetIds(availableIds, storedOrder);
  }

  function applyLayoutToContainer(container, record, definitions) {
    if (!container) {
      return [];
    }

    const ownerDocument = container.ownerDocument || (typeof document !== 'undefined' ? document : null);
    const existingNodes = collectExistingNodes(container);
    const nextOrder = resolveLayoutOrder(definitions);
    const fragment = ownerDocument?.createDocumentFragment ? ownerDocument.createDocumentFragment() : null;
    const nodesForMount = new Map();

    for (const id of nextOrder) {
      const definition = getDefinition(id);
      if (!definition) {
        continue;
      }
      let node = existingNodes.get(id);
      if (node) {
        existingNodes.delete(id);
      } else {
        node = createWidgetNode(record, definition, ownerDocument);
      }
      if (!node) {
        continue;
      }
      node.setAttribute('data-widget', definition.id);
      if (!node.classList?.contains('browser-widget')) {
        node.classList?.add('browser-widget');
      }
      if (fragment) {
        fragment.appendChild(node);
      } else {
        container.appendChild(node);
      }
      nodesForMount.set(id, node);
    }

    for (const leftover of existingNodes.values()) {
      leftover.remove();
    }

    if (fragment) {
      container.appendChild(fragment);
    }

    for (const [id, node] of nodesForMount.entries()) {
      const record = widgetControllers.get(id);
      if (record?.controller) {
        mountWidgetController(id, record.controller, node);
      }
    }

    currentLayoutOrder = nextOrder.slice();
    activeContainer = container;
    return nextOrder;
  }

  function renderLayout({ container } = {}) {
    const record = resolveMountRecord();
    const targetContainer = container || getMountContainer(record);
    const definitions = getDefinitions();
    ensureWidgetControllers(definitions);
    if (!targetContainer) {
      activeContainer = null;
      currentLayoutOrder = [];
      return [];
    }
    const order = applyLayoutToContainer(targetContainer, record, definitions);
    return order;
  }

  function getWidgetControllerInstance(widgetId) {
    if (!widgetId) return null;
    if (!widgetControllers.has(widgetId)) {
      renderLayout();
    }
    const record = widgetControllers.get(widgetId) || null;
    const controller = record?.controller || null;
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

  function getLayoutOrder() {
    if (!currentLayoutOrder.length) {
      const definitions = getDefinitions();
      return resolveLayoutOrder(definitions);
    }
    return currentLayoutOrder.slice();
  }

  function setLayoutOrder(order = []) {
    const definitions = getDefinitions();
    const availableIds = definitions.map(definition => definition.id);
    const normalized = getOrderedWidgetIds(availableIds, Array.isArray(order) ? order : []);
    persistOrder(normalized, storageKey);
    currentLayoutOrder = normalized.slice();
    renderLayout({ container: activeContainer });
    return currentLayoutOrder.slice();
  }

  function resetForTests() {
    for (const [id, record] of widgetControllers.entries()) {
      destroyControllerRecord(id, record);
    }
    widgetControllers.clear();
    widgetMounts.clear();
    knownWidgetDefinitions.clear();
    knownRegistryVersion = -1;
    currentLayoutOrder = [];
    activeContainer = null;
  }

  return {
    renderLayout,
    getWidgetController: getWidgetControllerInstance,
    getLayoutOrder,
    setLayoutOrder,
    __testables: {
      reset: resetForTests,
      listTemplates,
      resolveMountRecord,
      hasController(id) {
        const record = widgetControllers.get(id);
        return Boolean(record?.controller);
      }
    }
  };
}

const fallbackLayoutManager = createLayoutManager();

function getDefaultInstance() {
  const record = defaultResolveMountRecord();
  if (record?.layoutManager) {
    return record.layoutManager;
  }
  return fallbackLayoutManager;
}

function renderLayout(options) {
  return getDefaultInstance().renderLayout(options);
}

function getWidgetController(widgetId) {
  return getDefaultInstance().getWidgetController(widgetId);
}

function getLayoutOrder() {
  return getDefaultInstance().getLayoutOrder();
}

function setLayoutOrder(order = []) {
  return getDefaultInstance().setLayoutOrder(order);
}

const layoutManager = {
  renderLayout,
  getWidgetController,
  getLayoutOrder,
  setLayoutOrder
};

Object.defineProperty(layoutManager, '__testables', {
  enumerable: true,
  get() {
    return getDefaultInstance().__testables;
  }
});

export default layoutManager;
export {
  createLayoutManager,
  renderLayout,
  getWidgetController,
  getLayoutOrder,
  setLayoutOrder
};
