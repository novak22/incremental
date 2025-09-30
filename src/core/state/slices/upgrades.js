import { structuredClone } from '../../helpers.js';
import { getRegistrySnapshot, getUpgradeDefinition } from '../registry.js';

function normalizeAssistantState(upgradeState = {}) {
  const normalized = upgradeState;
  const storedCount = Number(normalized.count);
  if (!Number.isFinite(storedCount)) {
    normalized.count = normalized.purchased ? 1 : 0;
  } else {
    normalized.count = Math.max(0, storedCount);
  }
  if (normalized.purchased && normalized.count === 0) {
    normalized.count = 1;
  }
  delete normalized.purchased;
  return normalized;
}

export function ensureSlice(state) {
  if (!state) return {};
  state.upgrades = state.upgrades || {};
  const registry = getRegistrySnapshot();
  for (const definition of registry.upgrades) {
    const defaults = structuredClone(definition.defaultState || {});
    const existing = state.upgrades[definition.id];
    if (existing) {
      const merged = {
        ...defaults,
        ...(typeof existing === 'object' && existing !== null ? existing : {})
      };
      if (typeof existing === 'object' && existing !== null) {
        Object.assign(existing, merged);
        if (definition.id === 'assistant') {
          normalizeAssistantState(existing);
        }
      } else {
        state.upgrades[definition.id] = merged;
        if (definition.id === 'assistant') {
          normalizeAssistantState(state.upgrades[definition.id]);
        }
      }
    } else {
      const normalized = { ...defaults };
      if (definition.id === 'assistant') {
        normalizeAssistantState(normalized);
      }
      state.upgrades[definition.id] = normalized;
    }
  }
  return state.upgrades;
}

export function getSliceState(state, id) {
  if (!state) return {};
  const upgrades = ensureSlice(state);
  if (!id) {
    return upgrades;
  }
  if (!upgrades[id]) {
    const definition = getUpgradeDefinition(id);
    const defaults = structuredClone(definition?.defaultState || {});
    upgrades[id] = defaults;
  }
  if (id === 'assistant') {
    normalizeAssistantState(upgrades[id]);
  }
  return upgrades[id];
}

export default {
  ensureSlice,
  getSliceState
};
