import { structuredClone } from '../../helpers.js';
import { getHustleDefinition } from '../registry.js';
import { createRegistrySliceManager } from './factory.js';

const { ensureSlice, getSliceState } = createRegistrySliceManager({
  sliceKey: 'hustles',
  registryKey: 'hustles',
  definitionLookup: getHustleDefinition,
  defaultFactory: (definition) => {
    if (!definition) {
      return {};
    }
    return structuredClone(definition.defaultState || {});
  },
  normalizer: (definition, entry = {}) => {
    if (!definition) {
      return entry || {};
    }
    const defaults = structuredClone(definition.defaultState || {});
    const existing = typeof entry === 'object' && entry !== null ? entry : {};
    return { ...defaults, ...existing };
  }
});

export { ensureSlice, getSliceState };

