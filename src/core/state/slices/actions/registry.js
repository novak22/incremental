import { createRegistrySliceManager } from '../factory.js';
import {
  createDefaultActionState,
  normalizeActionState,
  migrateLegacyHustleProgress,
  resolveDefinition
} from './instances.js';

const { ensureSlice, getSliceState } = createRegistrySliceManager({
  sliceKey: 'actions',
  registryKey: 'actions',
  definitionLookup: resolveDefinition,
  defaultFactory: definition => createDefaultActionState(definition),
  normalizer: (definition, entry, context) => normalizeActionState(definition, entry, context),
  ensureHook: migrateLegacyHustleProgress
});

export { ensureSlice, getSliceState };
