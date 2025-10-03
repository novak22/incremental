export const VIEW_DASHBOARD = 'dashboard';
export const VIEW_UPGRADES = 'upgrades';
export const VIEW_PRICING = 'pricing';

export const initialState = {
  view: VIEW_DASHBOARD,
  selectedStoreId: null,
  selectedUpgradeId: null
};

function ensureSelectedStore(state = initialState, model = {}) {
  const instances = Array.isArray(model.instances) ? model.instances : [];
  if (!instances.length) {
    state.selectedStoreId = null;
    return;
  }
  const active = instances.find(entry => entry?.status?.id === 'active');
  const fallback = instances[0];
  const existing = instances.find(entry => entry.id === state.selectedStoreId);
  state.selectedStoreId = (existing || active || fallback)?.id ?? null;
}

function ensureSelectedUpgrade(state = initialState, model = {}) {
  if (state.view !== VIEW_UPGRADES) {
    return;
  }
  const upgrades = Array.isArray(model.upgrades) ? model.upgrades : [];
  if (!upgrades.length) {
    state.selectedUpgradeId = null;
    return;
  }
  const ready = upgrades.find(entry => entry?.snapshot?.ready);
  const existing = upgrades.find(entry => entry.id === state.selectedUpgradeId);
  state.selectedUpgradeId = (existing || ready || upgrades[0])?.id ?? null;
}

export function ensureSelection(state = { ...initialState }, model = {}) {
  ensureSelectedStore(state, model);
  ensureSelectedUpgrade(state, model);
}

export function reduceSetView(state = initialState, model = {}, view, options = {}) {
  const next = { ...state };
  next.view = view || VIEW_DASHBOARD;
  if (Object.prototype.hasOwnProperty.call(options, 'storeId')) {
    next.selectedStoreId = options.storeId ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(options, 'upgradeId')) {
    next.selectedUpgradeId = options.upgradeId ?? null;
  }
  ensureSelection(next, model);
  return next;
}

export function reduceSelectStore(state = initialState, model = {}, storeId) {
  return reduceSetView(state, model, VIEW_DASHBOARD, { storeId });
}

export function reduceSelectUpgrade(state = initialState, model = {}, upgradeId) {
  return reduceSetView(state, model, VIEW_UPGRADES, { upgradeId });
}

export function derivePath(state = initialState) {
  switch (state.view) {
    case VIEW_PRICING:
      return 'pricing';
    case VIEW_UPGRADES:
      return state.selectedUpgradeId ? `upgrades/${state.selectedUpgradeId}` : 'upgrades';
    case VIEW_DASHBOARD:
    default:
      return state.selectedStoreId ? `store/${state.selectedStoreId}` : '';
  }
}

export function getSelectedStore(state = initialState, model = {}) {
  const instances = Array.isArray(model.instances) ? model.instances : [];
  if (!instances.length) return null;
  const id = state.selectedStoreId;
  return instances.find(entry => entry.id === id) || instances[0] || null;
}

export function getSelectedUpgrade(state = initialState, model = {}) {
  const upgrades = Array.isArray(model.upgrades) ? model.upgrades : [];
  if (!upgrades.length) return null;
  const id = state.selectedUpgradeId;
  return upgrades.find(entry => entry.id === id) || upgrades[0] || null;
}

export default {
  VIEW_DASHBOARD,
  VIEW_UPGRADES,
  VIEW_PRICING,
  initialState,
  ensureSelection,
  reduceSetView,
  reduceSelectStore,
  reduceSelectUpgrade,
  derivePath,
  getSelectedStore,
  getSelectedUpgrade
};
