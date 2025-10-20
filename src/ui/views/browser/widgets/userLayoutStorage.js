const STORAGE_KEY = 'browser.widgets.layout';
const DEFAULT_LAYOUT_ID = 'default';

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage || null;
  } catch (error) {
    return null;
  }
}

function normalizeLayoutIdentifier(identifier) {
  if (!identifier) {
    return {
      id: DEFAULT_LAYOUT_ID,
      storageKey: STORAGE_KEY
    };
  }

  if (typeof identifier === 'string') {
    const key = identifier.trim();
    return {
      id: DEFAULT_LAYOUT_ID,
      storageKey: key || STORAGE_KEY
    };
  }

  if (typeof identifier === 'object') {
    const layoutId = typeof identifier.id === 'string' ? identifier.id.trim() : '';
    const storageKey =
      typeof identifier.storageKey === 'string' && identifier.storageKey.trim()
        ? identifier.storageKey.trim()
        : STORAGE_KEY;
    return {
      id: layoutId || DEFAULT_LAYOUT_ID,
      storageKey
    };
  }

  return {
    id: DEFAULT_LAYOUT_ID,
    storageKey: STORAGE_KEY
  };
}

function resolveStorageKey(identifier) {
  const normalized = normalizeLayoutIdentifier(identifier);
  if (normalized.id === DEFAULT_LAYOUT_ID) {
    return normalized.storageKey;
  }
  return `${normalized.storageKey}.${normalized.id}`;
}

function loadLayoutOrder(layoutIdentifier) {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const storageKey = resolveStorageKey(layoutIdentifier);
    const stored = JSON.parse(storage.getItem(storageKey));
    if (Array.isArray(stored)) {
      return stored.filter(id => typeof id === 'string' && id);
    }
  } catch (error) {
    return [];
  }
  return [];
}

function persistLayoutOrder(order = [], layoutIdentifier) {
  const storage = getStorage();
  if (!storage) return;
  try {
    const storageKey = resolveStorageKey(layoutIdentifier);
    if (Array.isArray(order) && order.length) {
      storage.setItem(storageKey, JSON.stringify(order));
    } else {
      storage.removeItem(storageKey);
    }
  } catch (error) {
    // Swallow persistence errors to avoid blocking layout updates.
  }
}

function getOrderedWidgetIds(availableIds = [], storedOrder = []) {
  const uniqueIds = Array.from(new Set(availableIds.filter(Boolean)));
  if (!uniqueIds.length) return [];
  const filtered = Array.isArray(storedOrder)
    ? storedOrder.filter(id => uniqueIds.includes(id))
    : [];
  const missing = uniqueIds.filter(id => !filtered.includes(id));
  return [...filtered, ...missing];
}

function getOrderedDefinitions(definitions = [], storedOrder = []) {
  const map = new Map();
  definitions.forEach(definition => {
    if (definition?.id) {
      map.set(definition.id, definition);
    }
  });
  const orderedIds = getOrderedWidgetIds(
    definitions.map(definition => definition?.id),
    storedOrder
  );
  return orderedIds.map(id => map.get(id)).filter(Boolean);
}

export {
  STORAGE_KEY,
  DEFAULT_LAYOUT_ID,
  getStorage,
  normalizeLayoutIdentifier,
  resolveStorageKey,
  loadLayoutOrder,
  persistLayoutOrder,
  getOrderedWidgetIds,
  getOrderedDefinitions
};

export default {
  STORAGE_KEY,
  DEFAULT_LAYOUT_ID,
  getStorage,
  normalizeLayoutIdentifier,
  resolveStorageKey,
  loadLayoutOrder,
  persistLayoutOrder,
  getOrderedWidgetIds,
  getOrderedDefinitions
};
