import { STORAGE_KEY } from './constants.js';
import { structuredClone } from './helpers.js';
import { defaultStateManager } from './state.js';
import { StatePersistence } from './persistence/index.js';

export function createStorage({
  stateManager = defaultStateManager,
  storageKey = STORAGE_KEY,
  storage = globalThis?.localStorage,
  clone = structuredClone,
  now = () => Date.now(),
  migrations,
  logger,
  repository,
  migrationRunner
} = {}) {
  const persistence = new StatePersistence({
    storageKey,
    storage,
    clone,
    now,
    buildDefaultState: (...args) => stateManager.buildDefaultState(...args),
    initializeState: (...args) => stateManager.initializeState(...args),
    replaceState: (...args) => stateManager.replaceState(...args),
    ensureStateShape: (...args) => stateManager.ensureStateShape(...args),
    getState: (...args) => stateManager.getState(...args),
    getAssetState: (...args) => stateManager.getAssetState(...args),
    getUpgradeState: (...args) => stateManager.getUpgradeState(...args),
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

