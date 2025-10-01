import { normalizeAssetState } from '../assets.js';
import { getAssetDefinition } from '../registry.js';
import { createRegistrySliceManager } from './factory.js';

const { ensureSlice, getSliceState } = createRegistrySliceManager({
  sliceKey: 'assets',
  registryKey: 'assets',
  definitionLookup: getAssetDefinition,
  defaultFactory: (definition, { state }) => {
    if (!definition) {
      return {};
    }
    return normalizeAssetState(definition, {}, { state });
  },
  normalizer: (definition, entry = {}, { state }) => {
    if (!definition) {
      return entry || {};
    }
    return normalizeAssetState(definition, entry || {}, { state });
  }
});

export { ensureSlice, getSliceState };

export default {
  ensureSlice,
  getSliceState
};
