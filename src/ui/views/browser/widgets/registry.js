import { createTodoWidgetController } from './todoWidget.js';
import { createAppsWidgetController } from './appsWidget.js';
import { createBankWidgetController } from './bankWidget.js';
import { getSharedWidgetController } from './sharedWidgetControllers.js';

const defaultDefinitions = [
  {
    id: 'apps',
    title: 'Bookmarks',
    factory: createAppsWidgetController,
    fallbackFactory: () => getSharedWidgetController('apps'),
    featureFlags: []
  },
  {
    id: 'todo',
    title: 'ToDo',
    factory: createTodoWidgetController,
    fallbackFactory: () => getSharedWidgetController('todo'),
    featureFlags: []
  },
  {
    id: 'bank',
    title: 'Bank Snapshot',
    factory: createBankWidgetController,
    fallbackFactory: () => getSharedWidgetController('bank'),
    featureFlags: []
  }
];

const definitions = [];
const definitionMap = new Map();
let registryVersion = 0;

function cloneDefinition(definition) {
  if (!definition) return null;
  const {
    id,
    title = '',
    factory,
    featureFlags = [],
    fallbackFactory = null
  } = definition;
  if (typeof id !== 'string' || !id.trim()) {
    return null;
  }
  if (typeof factory !== 'function') {
    return null;
  }
  const normalized = {
    id,
    title,
    factory,
    featureFlags: Array.isArray(featureFlags) ? featureFlags.slice() : [],
    fallbackFactory: typeof fallbackFactory === 'function' ? fallbackFactory : null
  };
  return normalized;
}

function bumpVersion() {
  registryVersion += 1;
}

function registerWidget(definition) {
  const entry = cloneDefinition(definition);
  if (!entry) {
    return null;
  }
  if (definitionMap.has(entry.id)) {
    const index = definitions.findIndex(item => item.id === entry.id);
    if (index >= 0) {
      definitions.splice(index, 1);
    }
  }
  definitions.push(entry);
  definitionMap.set(entry.id, entry);
  bumpVersion();
  return entry;
}

function unregisterWidget(id) {
  if (!definitionMap.has(id)) {
    return false;
  }
  definitionMap.delete(id);
  const index = definitions.findIndex(def => def.id === id);
  if (index >= 0) {
    definitions.splice(index, 1);
  }
  bumpVersion();
  return true;
}

function getWidgetDefinitions() {
  return definitions.slice();
}

function getWidgetDefinition(id) {
  return definitionMap.get(id) || null;
}

function getWidgetRegistryVersion() {
  return registryVersion;
}

function resetWidgetRegistry() {
  definitions.splice(0, definitions.length);
  definitionMap.clear();
  bumpVersion();
  defaultDefinitions.forEach(registerWidget);
}

resetWidgetRegistry();

export {
  getWidgetDefinitions,
  getWidgetDefinition,
  getWidgetRegistryVersion,
  registerWidget,
  unregisterWidget,
  resetWidgetRegistry
};

export default definitions;
