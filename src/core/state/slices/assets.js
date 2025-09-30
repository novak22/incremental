import { normalizeAssetState } from '../assets.js';
import { getRegistrySnapshot, getAssetDefinition } from '../registry.js';

export function ensureSlice(state) {
  if (!state) return {};
  state.assets = state.assets || {};
  const registry = getRegistrySnapshot();
  for (const definition of registry.assets) {
    const existing = state.assets[definition.id] || {};
    state.assets[definition.id] = normalizeAssetState(definition, existing, { state });
  }
  return state.assets;
}

export function getSliceState(state, id) {
  if (!state) return {};
  const assets = ensureSlice(state);
  if (!id) {
    return assets;
  }
  const definition = getAssetDefinition(id);
  if (!definition) {
    assets[id] = assets[id] || {};
    return assets[id];
  }
  assets[id] = normalizeAssetState(definition, assets[id] || {}, { state });
  return assets[id];
}

export default {
  ensureSlice,
  getSliceState
};
