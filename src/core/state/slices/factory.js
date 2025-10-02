import { structuredClone } from '../../helpers.js';
import { getRegistrySnapshot } from '../registry.js';

function resolveDefinitionById(registryKey, id) {
  if (!registryKey || !id) {
    return undefined;
  }
  const registry = getRegistrySnapshot();
  const definitions = Array.isArray(registry[registryKey]) ? registry[registryKey] : [];
  return definitions.find(definition => definition?.id === id);
}

export function createRegistrySliceManager({
  sliceKey,
  registryKey,
  defaultFactory = (definition) => structuredClone(definition?.defaultState || {}),
  normalizer = (_, entry) => entry,
  definitionLookup,
  ensureHook,
  getHook
} = {}) {
  if (!sliceKey) {
    throw new Error('sliceKey is required when creating a registry slice manager');
  }

  const resolveDefinition = typeof definitionLookup === 'function'
    ? definitionLookup
    : (id) => resolveDefinitionById(registryKey, id);

  function ensureSlice(state, context = {}) {
    if (!state) return {};

    if (!state[sliceKey] || typeof state[sliceKey] !== 'object') {
      state[sliceKey] = {};
    }

    const sliceState = state[sliceKey];
    const managerContext = {
      state,
      sliceState,
      sliceKey,
      context
    };

    if (registryKey) {
      const registry = getRegistrySnapshot();
      const definitions = Array.isArray(registry[registryKey]) ? registry[registryKey] : [];
      for (const definition of definitions) {
        const id = definition?.id;
        if (!id) continue;

        if (sliceState[id] === undefined) {
          sliceState[id] = defaultFactory(definition, managerContext);
        }

        const normalized = normalizer(definition, sliceState[id], managerContext);
        if (normalized !== sliceState[id]) {
          sliceState[id] = normalized;
        }
      }
    }

    if (typeof ensureHook === 'function') {
      ensureHook(managerContext);
    }

    return sliceState;
  }

  function getSliceState(state, id, context = {}) {
    if (!state) return {};

    const sliceState = ensureSlice(state, context);
    if (!id) {
      if (typeof getHook === 'function') {
        getHook({
          state,
          sliceState,
          sliceKey,
          context
        });
      }
      return sliceState;
    }

    if (sliceState[id] === undefined) {
      const definition = resolveDefinition(id);
      sliceState[id] = defaultFactory(definition, {
        state,
        sliceState,
        sliceKey,
        context,
        id
      });
    }

    const definition = resolveDefinition(id);
    const normalized = normalizer(definition, sliceState[id], {
      state,
      sliceState,
      sliceKey,
      context,
      id
    });
    if (normalized !== sliceState[id]) {
      sliceState[id] = normalized;
    }

    if (typeof getHook === 'function') {
      getHook({
        state,
        sliceState,
        sliceKey,
        context,
        id,
        entry: sliceState[id],
        definition
      });
    }

    return sliceState[id];
  }

  return {
    ensureSlice,
    getSliceState
  };
}

