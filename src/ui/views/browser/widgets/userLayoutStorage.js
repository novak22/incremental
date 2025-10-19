const STORAGE_KEY = 'browser.widgets.layout';

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

function loadLayoutOrder(storageKey = STORAGE_KEY) {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const stored = JSON.parse(storage.getItem(storageKey));
    if (Array.isArray(stored)) {
      return stored.filter(id => typeof id === 'string' && id);
    }
  } catch (error) {
    return [];
  }
  return [];
}

function persistLayoutOrder(order = [], storageKey = STORAGE_KEY) {
  const storage = getStorage();
  if (!storage) return;
  try {
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
  getStorage,
  loadLayoutOrder,
  persistLayoutOrder,
  getOrderedWidgetIds,
  getOrderedDefinitions
};

export default {
  STORAGE_KEY,
  getStorage,
  loadLayoutOrder,
  persistLayoutOrder,
  getOrderedWidgetIds,
  getOrderedDefinitions
};
