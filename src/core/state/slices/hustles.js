import { structuredClone } from '../../helpers.js';
import { getRegistrySnapshot, getHustleDefinition } from '../registry.js';

export function ensureSlice(state) {
  if (!state) return {};
  state.hustles = state.hustles || {};
  const registry = getRegistrySnapshot();
  for (const definition of registry.hustles) {
    const defaults = structuredClone(definition.defaultState || {});
    const existing = state.hustles[definition.id];
    state.hustles[definition.id] = existing ? { ...defaults, ...existing } : defaults;
  }
  return state.hustles;
}

export function getSliceState(state, id) {
  if (!state) return {};
  const hustles = ensureSlice(state);
  if (!id) {
    return hustles;
  }
  if (!hustles[id]) {
    const definition = getHustleDefinition(id);
    hustles[id] = structuredClone(definition?.defaultState || {});
  }
  return hustles[id];
}

export default {
  ensureSlice,
  getSliceState
};
