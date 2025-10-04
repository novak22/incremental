const STORAGE_KEY = 'browser.apps.order';

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

function loadSortOrder(storageKey = STORAGE_KEY) {
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

function persistSortOrder(order = [], storageKey = STORAGE_KEY) {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (Array.isArray(order) && order.length) {
      storage.setItem(storageKey, JSON.stringify(order));
    } else {
      storage.removeItem(storageKey);
    }
  } catch (error) {
    // Ignore persistence errors to keep the widget responsive.
  }
}

function getOrderedIds(availableIds = [], storedOrder = []) {
  const uniqueIds = Array.from(new Set(availableIds.filter(Boolean)));
  if (!uniqueIds.length) return [];
  const filtered = Array.isArray(storedOrder)
    ? storedOrder.filter(id => uniqueIds.includes(id))
    : [];
  const missing = uniqueIds.filter(id => !filtered.includes(id));
  return [...filtered, ...missing];
}

function getOrderedPages(pages = [], storedOrder = []) {
  const map = new Map();
  pages.forEach(page => {
    if (page?.id) {
      map.set(page.id, page);
    }
  });
  const orderedIds = getOrderedIds(
    pages.map(page => page?.id),
    storedOrder
  );
  return orderedIds.map(id => map.get(id)).filter(Boolean);
}

export {
  STORAGE_KEY,
  getStorage,
  loadSortOrder,
  persistSortOrder,
  getOrderedIds,
  getOrderedPages
};
