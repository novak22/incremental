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

  function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
  }

  function cloneSnapshot(value) {
    if (typeof persistence.clone === 'function') {
      try {
        return persistence.clone(value);
      } catch (error) {
        // fall through to structured fallbacks below
      }
    }
    if (Array.isArray(value)) {
      return value.map(item => cloneSnapshot(item));
    }
    if (value && typeof value === 'object') {
      return Object.keys(value).reduce((acc, key) => {
        acc[key] = cloneSnapshot(value[key]);
        return acc;
      }, {});
    }
    return value;
  }

  function safeParseSnapshot(raw) {
    if (typeof raw !== 'string' || !raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      logger?.error?.('Failed to parse stored session snapshot for export', error);
      return null;
    }
  }

  function ensureSnapshotDefaults(snapshot, fallbackLastSaved) {
    const working = isPlainObject(snapshot) ? cloneSnapshot(snapshot) : {};
    const resolvedLastSaved = Number.isFinite(working.lastSaved)
      ? Number(working.lastSaved)
      : Number.isFinite(fallbackLastSaved)
      ? Number(fallbackLastSaved)
      : now();
    working.lastSaved = resolvedLastSaved;
    if (!Number.isInteger(working.version)) {
      working.version = persistence.version;
    }
    return working;
  }

  function buildBaselineSnapshot(lastSaved) {
    const baseline = cloneSnapshot(buildDefaultState());
    baseline.lastSaved = Number.isFinite(lastSaved) ? Number(lastSaved) : now();
    baseline.version = Number.isInteger(baseline.version)
      ? Math.max(baseline.version, persistence.version)
      : persistence.version;
    return baseline;
  }

  function normalizeImportPayload(payload) {
    if (!payload) {
      return null;
    }
    const source = typeof payload === 'string' ? safeParseSnapshot(payload) : payload;
    if (!isPlainObject(source)) {
      return null;
    }
    if (source.type && source.type !== 'online-hustle-sim/session') {
      return null;
    }

    const sessionDescriptor = isPlainObject(source.session) ? source.session : {};
    const rawSnapshot = source.snapshot;
    if (!isPlainObject(rawSnapshot)) {
      return null;
    }

    const snapshot = ensureSnapshotDefaults(rawSnapshot, sessionDescriptor.lastSaved);
    const metadata = isPlainObject(sessionDescriptor.metadata) ? { ...sessionDescriptor.metadata } : {};
    const nameCandidate = typeof sessionDescriptor.name === 'string' ? sessionDescriptor.name.trim() : '';
    const resolvedName = nameCandidate || 'Imported Session';

    return {
      name: resolvedName,
      metadata,
      snapshot,
      lastSaved: snapshot.lastSaved
    };
  }

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
        const session = persistence.setSession(updated);
        return { session, loadResult: null };
      }
      return { session: updated, loadResult: null };
    },
    deleteSession(id, loadOptions = {}) {
      const { removed, nextSession } = sessions.deleteSession(id);
      const result = applySessionChange(nextSession, loadOptions);
      return { removed, ...result };
    },
    resetActiveSession(loadOptions = {}) {
      ensureStorageReference();
      let active = persistence.getActiveSession();
      if (!active) {
        active = persistence.refreshActiveSession();
      }
      if (!active) {
        const loadResult = reloadActiveSession(loadOptions);
        return { session: null, loadResult };
      }
      if (active.storageKey) {
        try {
          persistence.storage?.removeItem?.(active.storageKey);
        } catch (error) {
          persistence.logger?.error?.('Failed to clear session snapshot during reset', error);
        }
      }
      persistence.sessionRepository.updateSession(active.id, { lastSaved: null });
      return applySessionChange(active, loadOptions);
    },
    setActiveSession(descriptor, loadOptions = {}) {
      const active = sessions.setActiveSession(descriptor);
      return applySessionChange(active, loadOptions);
    },
    exportSession({ id } = {}) {
      ensureStorageReference();
      const active = id ? sessions.getSession(id) : sessions.getActiveSession();
      if (!active?.id) {
        return null;
      }
      const session = sessions.getSession(active.id);
      if (!session) {
        return null;
      }
      const repository = sessions.createSnapshotRepository(session.id);
      const result = repository.loadRaw();
      if (result.type === 'error') {
        logger?.error?.('Failed to read session snapshot during export', result.error);
        return null;
      }
      let snapshot = null;
      if (result.type === 'success') {
        snapshot = safeParseSnapshot(result.value);
      } else if (result.type === 'empty') {
        snapshot = buildBaselineSnapshot(session.lastSaved);
      }
      if (!snapshot) {
        snapshot = buildBaselineSnapshot(session.lastSaved);
      } else {
        snapshot = ensureSnapshotDefaults(snapshot, session.lastSaved);
      }
      const metadata = isPlainObject(session.metadata) ? { ...session.metadata } : {};
      return {
        type: 'online-hustle-sim/session',
        version: 1,
        session: {
          id: session.id,
          name: session.name,
          lastSaved: snapshot.lastSaved,
          metadata
        },
        snapshot
      };
    },
    importSession(payload, loadOptions = {}) {
      ensureStorageReference();
      const normalized = normalizeImportPayload(payload);
      if (!normalized) {
        return null;
      }

      const created = sessions.createSession(
        {
          name: normalized.name,
          metadata: normalized.metadata,
          lastSaved: normalized.lastSaved
        },
        { setActive: false }
      );

      const repository = sessions.createSnapshotRepository(created.id);
      const serialized = JSON.stringify(normalized.snapshot);
      const saveResult = repository.saveRaw(serialized);
      if (saveResult.type === 'error') {
        logger?.error?.('Failed to persist imported session snapshot', saveResult.error);
        sessions.deleteSession(created.id);
        return null;
      }

      const sessionEntry = sessions.getSession(created.id) ?? created;
      return applySessionChange(sessionEntry, loadOptions);
    }
  };
}

