import { createRegistrySliceManager } from './factory.js';

const { ensureSlice, getSliceState } = createRegistrySliceManager({
  sliceKey: 'progress',
  defaultFactory: () => ({}),
  normalizer: (_, entry = {}) => (typeof entry === 'object' && entry !== null ? entry : {}),
  ensureHook: ({ sliceState }) => {
    if (!sliceState.knowledge || typeof sliceState.knowledge !== 'object') {
      sliceState.knowledge = {};
    }
  }
});

export { ensureSlice, getSliceState };

