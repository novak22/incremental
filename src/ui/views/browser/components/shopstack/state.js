import { collectCatalogItems, filterCatalogItems, findCatalogItem, getFirstCatalogItem } from './catalogData.js';

export const VIEW_CATALOG = 'catalog';
export const VIEW_PURCHASES = 'purchases';
export const VIEW_PRICING = 'pricing';

export const initialState = {
  view: VIEW_CATALOG,
  search: '',
  category: 'all',
  selectedItemId: null
};

function ensureCatalogSelection(state = initialState, model = {}, definitionMap = new Map()) {
  if (state.view !== VIEW_CATALOG) {
    return;
  }
  const items = collectCatalogItems(model, definitionMap);
  const filtered = filterCatalogItems(items, state);
  if (!filtered.length) {
    state.selectedItemId = null;
    return;
  }
  const existing = findCatalogItem(filtered, state.selectedItemId) || getFirstCatalogItem(filtered);
  state.selectedItemId = existing?.model?.id ?? null;
}

export function ensureSelection(state = { ...initialState }, model = {}, definitionMap = new Map()) {
  ensureCatalogSelection(state, model, definitionMap);
}

export function reduceSetView(state = initialState, model = {}, definitionMap = new Map(), view = VIEW_CATALOG, options = {}) {
  const next = { ...state, view };
  if (options.category !== undefined) {
    next.category = options.category;
  }
  if (options.search !== undefined) {
    next.search = options.search;
  }
  if (options.selectedItemId !== undefined) {
    next.selectedItemId = options.selectedItemId;
  }
  ensureSelection(next, model, definitionMap);
  return next;
}

export function reduceSelectCatalogItem(state = initialState, model = {}, definitionMap = new Map(), itemId) {
  const next = { ...state, selectedItemId: itemId ?? null, view: VIEW_CATALOG };
  ensureSelection(next, model, definitionMap);
  return next;
}

export function reduceSearch(state = initialState, model = {}, definitionMap = new Map(), value = '') {
  const next = { ...state, search: value };
  ensureSelection(next, model, definitionMap);
  return next;
}

export function reduceCategory(state = initialState, model = {}, definitionMap = new Map(), category = 'all') {
  const next = { ...state, category };
  ensureSelection(next, model, definitionMap);
  return next;
}

export default {
  VIEW_CATALOG,
  VIEW_PURCHASES,
  VIEW_PRICING,
  initialState,
  ensureSelection,
  reduceSetView,
  reduceSelectCatalogItem,
  reduceSearch,
  reduceCategory
};
