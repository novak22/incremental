export const VIEW_EBOOKS = 'ebooks';
export const VIEW_STOCK = 'stock';
export const VIEW_PRICING = 'pricing';
export const VIEW_UPGRADES = 'upgrades';

export const initialState = {
  view: VIEW_EBOOKS,
  selectedType: 'ebook',
  selectedId: null,
  launchOpen: false
};

export function normalizeView(view) {
  switch (view) {
    case VIEW_EBOOKS:
    case VIEW_STOCK:
    case VIEW_UPGRADES:
      return view;
    case VIEW_PRICING:
      return VIEW_UPGRADES;
    default:
      return VIEW_EBOOKS;
  }
}

function collectInstances(model = {}) {
  const ebookInstances = Array.isArray(model.ebook?.instances) ? model.ebook.instances : [];
  const stockInstances = Array.isArray(model.stock?.instances) ? model.stock.instances : [];
  return { ebookInstances, stockInstances };
}

function ensureView(state = initialState, instances = {}) {
  state.view = normalizeView(state.view);
  const { ebookInstances = [], stockInstances = [] } = instances;
  if (state.view === VIEW_EBOOKS && !ebookInstances.length && stockInstances.length) {
    state.view = VIEW_STOCK;
  }
  if (state.view === VIEW_STOCK && !stockInstances.length && ebookInstances.length) {
    state.view = VIEW_EBOOKS;
  }
  if (state.view !== VIEW_UPGRADES && !ebookInstances.length && !stockInstances.length) {
    state.view = VIEW_EBOOKS;
  }
}

export function ensureSelection(state = { ...initialState }, model = {}) {
  const instances = collectInstances(model);
  ensureView(state, instances);
  state.view = normalizeView(state.view);
  let preferredType = state.selectedType || 'ebook';
  if (state.view === VIEW_STOCK) {
    preferredType = 'stockPhotos';
  } else if (state.view === VIEW_EBOOKS) {
    preferredType = 'ebook';
  }
  state.selectedType = preferredType;

  const collection = preferredType === 'stockPhotos'
    ? instances.stockInstances
    : instances.ebookInstances;

  if (!collection.length) {
    state.selectedId = null;
    return;
  }

  const active = collection.find(entry => entry?.status?.id === 'active');
  const existing = collection.find(entry => entry.id === state.selectedId);
  const fallback = collection[0];
  state.selectedId = (existing || active || fallback)?.id ?? null;
}

export function reduceSetView(state = initialState, model = {}, view) {
  const resolvedView = normalizeView(view || state.view || VIEW_EBOOKS);
  const next = { ...state, view: resolvedView };
  if (resolvedView === VIEW_EBOOKS) {
    next.selectedType = 'ebook';
  } else if (resolvedView === VIEW_STOCK) {
    next.selectedType = 'stockPhotos';
  }
  ensureSelection(next, model);
  return next;
}

export function reduceToggleLaunch(state = initialState, model = {}) {
  const next = { ...state, launchOpen: !state.launchOpen };
  ensureSelection(next, model);
  return next;
}

export function reduceOpenLaunch(state = initialState, model = {}) {
  const next = {
    ...state,
    ...(state.launchOpen ? {} : { launchOpen: true })
  };
  ensureSelection(next, model);
  return next;
}

export function reduceSelectInstance(state = initialState, model = {}, type, id) {
  const next = { ...state };
  if (type === 'stockPhotos') {
    next.view = VIEW_STOCK;
    next.selectedType = 'stockPhotos';
  } else {
    next.view = VIEW_EBOOKS;
    next.selectedType = 'ebook';
  }
  next.selectedId = id ?? null;
  ensureSelection(next, model);
  return next;
}

export function derivePath(state = initialState) {
  const view = normalizeView(state.view);
  switch (view) {
    case VIEW_UPGRADES:
      return 'upgrades';
    case VIEW_STOCK:
      return state.selectedId ? `stock/${state.selectedId}` : 'stock';
    case VIEW_EBOOKS:
    default:
      return state.selectedId ? `ebooks/${state.selectedId}` : 'ebooks';
  }
}

export function getSelectedCollection(state = initialState, model = {}) {
  if (state.selectedType === 'stockPhotos') {
    return model.stock || { instances: [] };
  }
  return model.ebook || { instances: [] };
}

export function getSelectedInstance(state = initialState, model = {}) {
  const collection = getSelectedCollection(state, model);
  const instances = Array.isArray(collection?.instances) ? collection.instances : [];
  if (!instances.length) return null;
  const id = state.selectedId;
  return instances.find(entry => entry.id === id) || instances[0] || null;
}

export default {
  VIEW_EBOOKS,
  VIEW_STOCK,
  VIEW_PRICING,
  VIEW_UPGRADES,
  initialState,
  normalizeView,
  ensureSelection,
  reduceSetView,
  reduceToggleLaunch,
  reduceOpenLaunch,
  reduceSelectInstance,
  derivePath,
  getSelectedCollection,
  getSelectedInstance
};
