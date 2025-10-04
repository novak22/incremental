import { STORAGE_KEY } from './constants.js';
import { structuredClone } from './helpers.js';
import {
  defaultStateManager,
  createStateManager,
  buildDefaultState as buildDefaultStateWithDefault,
  initializeState as initializeStateWithDefault,
  replaceState as replaceStateWithDefault,
  ensureStateShape as ensureStateShapeWithDefault,
  getState as getStateWithDefault,
  getAssetState as getAssetStateWithDefault,
  getUpgradeState as getUpgradeStateWithDefault
} from './state.js';
import { StatePersistence } from './persistence/index.js';

export function createStorage({
  stateManager,
  storageKey = STORAGE_KEY,
  storage = globalThis?.localStorage,
  clone = structuredClone,
  now = () => Date.now(),
  migrations,
  logger,
  repository,
  migrationRunner
} = {}) {
  const resolvedStateManager =
    stateManager === null ? createStateManager() : stateManager ?? defaultStateManager;
  const usingDefaultManager = resolvedStateManager === defaultStateManager;

  const buildDefaultState = usingDefaultManager
    ? (...args) => buildDefaultStateWithDefault(...args)
    : (...args) => resolvedStateManager.buildDefaultState(...args);
  const initializeState = usingDefaultManager
    ? (...args) => initializeStateWithDefault(...args)
    : (...args) => resolvedStateManager.initializeState(...args);
  const replaceState = usingDefaultManager
    ? (...args) => replaceStateWithDefault(...args)
    : (...args) => resolvedStateManager.replaceState(...args);
  const ensureStateShape = usingDefaultManager
    ? (...args) => ensureStateShapeWithDefault(...args)
    : (...args) => resolvedStateManager.ensureStateShape(...args);
  const getState = usingDefaultManager
    ? (...args) => getStateWithDefault(...args)
    : (...args) => resolvedStateManager.getState(...args);
  const getAssetState = usingDefaultManager
    ? (...args) => getAssetStateWithDefault(...args)
    : (...args) => resolvedStateManager.getAssetState(...args);
  const getUpgradeState = usingDefaultManager
    ? (...args) => getUpgradeStateWithDefault(...args)
    : (...args) => resolvedStateManager.getUpgradeState(...args);

  const persistence = new StatePersistence({
    storageKey,
    storage,
    clone,
    now,
    buildDefaultState,
    initializeState,
    replaceState,
    ensureStateShape,
    getState,
    getAssetState,
    getUpgradeState,
    migrations,
    logger,
    repository,
    migrationRunner
  });

  function ensureStorageReference() {
    if (!persistence.storage && globalThis?.localStorage) {
      persistence.storage = globalThis.localStorage;
    }
  }

  return {
    persistence,
    loadState(options = {}) {
      ensureStorageReference();
      return persistence.load(options);
    },
    saveState() {
      ensureStorageReference();
      return persistence.save();
    }
  };
}

const defaultStorage = createStorage();

export const loadState = (...args) => defaultStorage.loadState(...args);
export const saveState = (...args) => defaultStorage.saveState(...args);

