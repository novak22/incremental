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
  migrationRunner,
  session,
  sessionRepository
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
    migrationRunner,
    session,
    sessionRepository
  });

  const sessions = persistence.sessionRepository;

  function ensureStorageReference() {
    if (!persistence.storage && globalThis?.localStorage) {
      persistence.storage = globalThis.localStorage;
    }
  }

  function reloadActiveSession(loadOptions = {}) {
    ensureStorageReference();
    return persistence.load(loadOptions);
  }

  function applySessionChange(sessionEntry, loadOptions = {}) {
    const activeSession = persistence.setSession(sessionEntry);
    const loadResult = reloadActiveSession(loadOptions);
    return { session: activeSession, loadResult };
  }

  return {
    persistence,
    loadState(options = {}) {
      return reloadActiveSession(options);
    },
    saveState() {
      ensureStorageReference();
      return persistence.save();
    },
    getActiveSession() {
      return persistence.getActiveSession();
    },
    listSessions() {
      return sessions.listSessions();
    },
    createSession(descriptor = {}, loadOptions = {}) {
      const created = sessions.createSession(descriptor, { setActive: true });
      return applySessionChange(created, loadOptions);
    },
    renameSession(id, name, loadOptions = {}) {
      const updated = sessions.renameSession(id, name);
      if (updated && persistence.session?.id === updated.id) {
        persistence.setSession(updated);
        const loadResult = reloadActiveSession(loadOptions);
        return { session: updated, loadResult };
      }
      return { session: updated, loadResult: null };
    },
    deleteSession(id, loadOptions = {}) {
      const { removed, nextSession } = sessions.deleteSession(id);
      const result = applySessionChange(nextSession, loadOptions);
      return { removed, ...result };
    },
    setActiveSession(descriptor, loadOptions = {}) {
      const active = sessions.setActiveSession(descriptor);
      return applySessionChange(active, loadOptions);
    }
  };
}

const defaultStorage = createStorage();

export const loadState = (...args) => defaultStorage.loadState(...args);
export const saveState = (...args) => defaultStorage.saveState(...args);
export const getActiveSession = (...args) => defaultStorage.getActiveSession(...args);
export const listSessions = (...args) => defaultStorage.listSessions(...args);
export const createSession = (...args) => defaultStorage.createSession(...args);
export const renameSession = (...args) => defaultStorage.renameSession(...args);
export const deleteSession = (...args) => defaultStorage.deleteSession(...args);
export const setActiveSession = (...args) => defaultStorage.setActiveSession(...args);

