import { collectCatalogItems, filterCatalogItems, findCatalogItem } from './catalogData.js';
import { VIEW_CATALOG, VIEW_PRICING, VIEW_PURCHASES } from './state.js';

export function getSelectedCatalogItem(state = {}, model = {}, definitionMap = new Map()) {
  const items = collectCatalogItems(model, definitionMap);
  if (!items.length) {
    return null;
  }
  if (!state.selectedItemId) {
    const filtered = filterCatalogItems(items, state);
    return filtered.length ? filtered[0] : items[0];
  }
  return findCatalogItem(items, state.selectedItemId) || null;
}

function deriveCatalogPath(state = {}, model = {}, definitionMap = new Map()) {
  const segments = ['catalog'];
  const selected = getSelectedCatalogItem(state, model, definitionMap);
  const filterCategory = state?.category && state.category !== 'all' ? state.category : null;
  const selectedCategory = selected?.category?.id || null;
  const categorySegment = selectedCategory || filterCategory;
  if (categorySegment) {
    segments.push(categorySegment);
  }
  const itemId = selected?.model?.id;
  if (itemId) {
    segments.push(itemId);
  }
  return segments.join('/');
}

export function deriveShopStackPath(state = {}, model = {}, definitionMap = new Map()) {
  switch (state?.view) {
    case VIEW_PURCHASES:
      return 'purchases';
    case VIEW_PRICING:
      return 'pricing';
    case VIEW_CATALOG:
    default:
      return deriveCatalogPath(state, model, definitionMap);
  }
}

export default {
  getSelectedCatalogItem,
  deriveShopStackPath
};
