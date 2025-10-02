import { structuredClone } from '../../helpers.js';
import { getUpgradeDefinition } from '../registry.js';
import { createRegistrySliceManager } from './factory.js';

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

const { ensureSlice, getSliceState } = createRegistrySliceManager({
  sliceKey: 'upgrades',
  registryKey: 'upgrades',
  definitionLookup: getUpgradeDefinition,
  defaultFactory: (definition) => {
    if (!definition) {
      return {};
    }
    const defaults = structuredClone(definition.defaultState || {});
    if (definition.id === 'assistant') {
      return normalizeAssistantState(defaults);
    }
    return defaults;
  },
  normalizer: (definition, entry = {}) => {
    if (!definition) {
      return typeof entry === 'object' && entry !== null ? entry : {};
    }
    const defaults = structuredClone(definition.defaultState || {});
    if (typeof entry === 'object' && entry !== null) {
      for (const [key, value] of Object.entries(defaults)) {
        if (!(key in entry)) {
          entry[key] = value;
        }
      }
      if (definition.id === 'assistant') {
        return normalizeAssistantState(entry);
      }
      return entry;
    }
    const merged = { ...defaults };
    if (typeof entry === 'object' && entry !== null) {
      Object.assign(merged, entry);
    }
    if (definition.id === 'assistant') {
      return normalizeAssistantState(merged);
    }
    return merged;
  }
});

export { ensureSlice, getSliceState };

