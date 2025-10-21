import { ensureArray } from '../../../../../core/helpers.js';

const SHOPSTACK_PLACEMENT = 'shopstack';

function normalizePlacement(value, fallback = SHOPSTACK_PLACEMENT) {
  const normalized = String(value || fallback || '').trim().toLowerCase();
  if (!normalized && fallback) {
    return fallback;
  }
  if (normalized === 'general') {
    return SHOPSTACK_PLACEMENT;
  }
  return normalized || fallback;
}

function isPlacementEnabled(definition, placement = SHOPSTACK_PLACEMENT) {
  const requestedPlacement = normalizePlacement(placement);
  const placements = ensureArray(definition?.placements)
    .map(entry => normalizePlacement(entry, null))
    .filter(Boolean);
  if (!placements.length) {
    return true;
  }
  return placements.includes(requestedPlacement);
}

export function createDefinitionMap(definitions = []) {
  const entries = ensureArray(definitions)
    .map(definition => [definition?.id, definition])
    .filter(([id, definition]) => id != null && definition);
  return new Map(entries);
}

export function collectCatalogItems(model = {}, definitionMap = new Map(), options = {}) {
  const { placement = SHOPSTACK_PLACEMENT } = options;
  const items = [];
  const categories = ensureArray(model.categories);
  categories.forEach(category => {
    const families = ensureArray(category.families);
    families.forEach(family => {
      ensureArray(family.definitions).forEach(entry => {
        const catalogEntry = entry?.model ?? entry;
        const id = catalogEntry?.id;
        if (!id) {
          return;
        }
        const definition = definitionMap.get(id);
        if (!definition || !isPlacementEnabled(definition, placement)) {
          return;
        }
        items.push({
          category,
          family,
          model: catalogEntry,
          definition
        });
      });
    });
  });
  return items;
}

export function filterCatalogItems(items = [], state = {}) {
  const search = String(state.search || '').trim().toLowerCase();
  const categoryFilter = state.category || 'all';
  return ensureArray(items).filter(item => {
    if (categoryFilter !== 'all' && item.category?.id !== categoryFilter) {
      return false;
    }
    if (search) {
      const haystack = `${item.model?.filters?.search || ''} ${item.model?.name || ''}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

export function findCatalogItem(items = [], id) {
  if (!id) return null;
  return ensureArray(items).find(item => item?.model?.id === id) || null;
}

export function getFirstCatalogItem(items = []) {
  const list = ensureArray(items);
  return list.length ? list[0] : null;
}

export function computeCatalogOverview(items = []) {
  return ensureArray(items).reduce(
    (acc, item) => {
      const snapshot = item?.model?.snapshot || {};
      acc.total += 1;
      if (snapshot.purchased) acc.purchased += 1;
      if (snapshot.ready) acc.ready += 1;
      return acc;
    },
    { purchased: 0, ready: 0, total: 0 }
  );
}

export default {
  createDefinitionMap,
  collectCatalogItems,
  filterCatalogItems,
  findCatalogItem,
  getFirstCatalogItem,
  computeCatalogOverview
};
