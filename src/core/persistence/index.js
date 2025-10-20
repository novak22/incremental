import { getAssetDefinition } from '../state/registry.js';
import { createAssetInstance } from '../state/assets.js';
import { SnapshotRepository } from './snapshotRepository.js';
import { StateMigrationRunner } from './stateMigrationRunner.js';
import { SessionRepository } from './sessionRepository.js';
import { success, error, empty, tryCatch } from './result.js';
import { syncNicheTrendSnapshots } from '../../game/events/syncNicheTrendSnapshots.js';
import { maybeSpawnNicheEvents } from '../../game/events/index.js';
import { createDefaultHustleMarketState } from '../state/slices/hustleMarket/index.js';
import { createDefaultActionMarketState } from '../state/slices/actionMarket/state.js';

function migrateLegacySnapshot(snapshot, context) {
  if (!snapshot || typeof snapshot !== 'object') {
    return context.clone(context.defaultState);
  }

  if (snapshot.version != null || snapshot.assets || snapshot.hustles || snapshot.upgrades) {
    return { ...snapshot };
  }

  const migrated = context.clone(context.defaultState);
  migrated.money = snapshot.money ?? migrated.money;
  migrated.timeLeft = snapshot.timeLeft ?? migrated.timeLeft;
  migrated.baseTime = snapshot.baseTime ?? migrated.baseTime;
  migrated.bonusTime = snapshot.bonusTime ?? migrated.bonusTime;
  migrated.dailyBonusTime = snapshot.dailyBonusTime ?? migrated.dailyBonusTime;
  migrated.day = snapshot.day ?? migrated.day;
  migrated.lastSaved = snapshot.lastSaved || context.now();

  const { getAssetState, getUpgradeState } = context.stateAccess || {};

  if (snapshot.blog && typeof getAssetState === 'function') {
    const blogState = getAssetState('blog', migrated);
    const blogDefinition = getAssetDefinition('blog');
    const legacyInstances = Array.isArray(snapshot.blog.instances)
      ? snapshot.blog.instances.map(instance =>
          createAssetInstance(blogDefinition, {
            status: instance.active ? 'active' : 'setup',
            daysRemaining: instance.active ? 0 : blogDefinition.setup?.days || 0,
            daysCompleted: instance.active ? blogDefinition.setup?.days || 0 : 0,
            totalIncome: instance.totalIncome || 0
          })
        )
      : [];
    const buffer = Number(snapshot.blog.buffer) || 0;
    const hadLegacyInstance = Boolean(snapshot.blog.active) || buffer > 0;

    if (legacyInstances.length) {
      blogState.instances = legacyInstances;
    } else if (hadLegacyInstance) {
      blogState.instances = [
        createAssetInstance(blogDefinition, {
          status: 'active',
          daysRemaining: 0,
          daysCompleted: blogDefinition.setup?.days || 0,
          totalIncome: buffer
        })
      ];
    } else {
      blogState.instances = [];
    }
  }

  if (snapshot.assistantHired && typeof getUpgradeState === 'function') {
    const assistant = getUpgradeState('assistant', migrated);
    assistant.count = Math.max(1, Number(assistant.count) || 0);
  }

  if (typeof getUpgradeState === 'function') {
    getUpgradeState('coffee', migrated).usedToday = snapshot.coffeesToday || 0;
  }

  migrated.log = Array.isArray(snapshot.log) ? snapshot.log : [];
  return migrated;
}

function cloneValue(value, clone) {
  if (typeof clone === 'function') {
    try {
      return clone(value);
    } catch (error) {
      // fall back to shallow structures below
    }
  }

  if (Array.isArray(value)) {
    return value.map(item => cloneValue(item, clone));
  }

  if (value && typeof value === 'object') {
    return { ...value };
  }

  return value;
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function migrateLegacyHustlesToActions(snapshot, context) {
  if (!snapshot || typeof snapshot !== 'object') {
    return snapshot;
  }

  const migrated = { ...snapshot };
  const defaultState = isPlainObject(context?.defaultState) ? context.defaultState : {};
  const clone = typeof context?.clone === 'function' ? context.clone : value => cloneValue(value);

  const defaultActions = isPlainObject(defaultState.actions)
    ? cloneValue(defaultState.actions, clone)
    : {};
  const existingActions = isPlainObject(snapshot.actions)
    ? cloneValue(snapshot.actions, clone)
    : {};

  migrated.actions = { ...defaultActions, ...existingActions };

  const ensureActionEntry = id => {
    if (!id) return null;
    if (!isPlainObject(migrated.actions[id])) {
      const fallback = isPlainObject(defaultActions[id]) ? defaultActions[id] : {};
      migrated.actions[id] = cloneValue(fallback, clone) || {};
    }
    return migrated.actions[id];
  };

  const legacyHustles = isPlainObject(snapshot.hustles) ? snapshot.hustles : null;
  if (legacyHustles) {
    for (const [id, legacyEntry] of Object.entries(legacyHustles)) {
      if (!legacyEntry || typeof legacyEntry !== 'object') continue;
      const target = ensureActionEntry(id);
      if (!target) continue;

      if (legacyEntry.runsToday != null && target.runsToday == null) {
        target.runsToday = legacyEntry.runsToday;
      }

      if (legacyEntry.lastRunDay != null && target.lastRunDay == null) {
        target.lastRunDay = legacyEntry.lastRunDay;
      }

      if (Array.isArray(legacyEntry.instances)) {
        const hasTargetInstances = Array.isArray(target.instances) && target.instances.length > 0;
        if (!hasTargetInstances) {
          target.instances = cloneValue(legacyEntry.instances, clone);
        }
      }

      for (const [key, value] of Object.entries(legacyEntry)) {
        if (key === 'runsToday' || key === 'lastRunDay' || key === 'instances') continue;
        if (target[key] === undefined) {
          target[key] = cloneValue(value, clone);
        }
      }
    }

    migrated.hustles = {};
  }

  if (!isPlainObject(migrated.hustleMarket)) {
    const defaultMarket = isPlainObject(defaultState.hustleMarket)
      ? defaultState.hustleMarket
      : createDefaultHustleMarketState();
    migrated.hustleMarket = cloneValue(defaultMarket, clone);
  }

  if (!isPlainObject(migrated.actionMarket)) {
    migrated.actionMarket = createDefaultActionMarketState();
  }
  const categories = isPlainObject(migrated.actionMarket.categories)
    ? migrated.actionMarket.categories
    : (migrated.actionMarket.categories = {});
  if (!categories.hustle && migrated.hustleMarket) {
    categories.hustle = migrated.hustleMarket;
  }

  return migrated;
}

function removeLegacyNicheRollDay(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return snapshot;
  }

  const niches = snapshot.niches;
  const migrated = { ...snapshot };

  if (!niches || typeof niches !== 'object') {
    if (niches !== undefined) {
      migrated.niches = niches;
    }
    return migrated;
  }

  const sanitizedNiches = { ...niches };
  if ('lastRollDay' in sanitizedNiches) {
    delete sanitizedNiches.lastRollDay;
  }
  migrated.niches = sanitizedNiches;
  return migrated;
}

const DEFAULT_MIGRATIONS = [
  migrateLegacySnapshot,
  removeLegacyNicheRollDay,
  migrateLegacyHustlesToActions
];

export { SnapshotRepository, StateMigrationRunner, SessionRepository };

export class StatePersistence {
  constructor({
    storageKey,
    storage = globalThis?.localStorage,
    clone,
    now = () => Date.now(),
    buildDefaultState,
    initializeState,
    replaceState,
    ensureStateShape,
    getState,
    getAssetState,
    getUpgradeState,
    migrations = DEFAULT_MIGRATIONS,
    logger = console,
    repository,
    migrationRunner,
    session,
    sessionRepository
  }) {
    this.storageKey = storageKey;
    this.clone = clone;
    this.now = now;
    this.buildDefaultState = buildDefaultState;
    this.initializeState = initializeState;
    this.replaceState = replaceState;
    this.ensureStateShape = ensureStateShape;
    this.getState = getState;
    this.stateAccess = {
      getAssetState:
        typeof getAssetState === 'function' ? getAssetState : () => ({ instances: [] }),
      getUpgradeState:
        typeof getUpgradeState === 'function' ? getUpgradeState : () => ({})
    };
    this.logger = logger;

    this.sessionRepository =
      sessionRepository ?? new SessionRepository({ storageKey, storage });

    const initialSession = this.sessionRepository.ensureSession(session);
    this.session = initialSession;

    const resolvedSnapshotKey = this.sessionRepository.resolveSnapshotKey(initialSession.id);

    this.repository =
      repository ?? new SnapshotRepository({ storageKey: resolvedSnapshotKey, storage: this.sessionRepository.storage });

    if (repository && repository.storageKey !== resolvedSnapshotKey) {
      this.repository.storageKey = resolvedSnapshotKey;
    }

    this.migrationRunner =
      migrationRunner ?? new StateMigrationRunner({ migrations });

    Object.defineProperty(this, 'storage', {
      get: () => this.repository.storage,
      set: value => {
        this.sessionRepository.storage = value;
        this.repository.storage = value;
      }
    });

    Object.defineProperty(this, 'migrations', {
      get: () => this.migrationRunner.migrations
    });

    Object.defineProperty(this, 'version', {
      get: () => this.migrationRunner.version
    });
  }

  ensureNicheEvents(state) {
    if (!state) return;
    const day = Number.isFinite(Number(state.day)) ? Number(state.day) : 1;
    maybeSpawnNicheEvents({ state, day });
  }

  setSession(sessionDescriptor) {
    const resolvedSession = this.sessionRepository.ensureSession(sessionDescriptor);
    this.session = resolvedSession;
    const snapshotKey = this.sessionRepository.resolveSnapshotKey(resolvedSession.id);
    if (this.repository) {
      this.repository.storageKey = snapshotKey;
      this.repository.storage = this.sessionRepository.storage;
    } else {
      this.repository = new SnapshotRepository({
        storageKey: snapshotKey,
        storage: this.sessionRepository.storage
      });
    }
    return resolvedSession;
  }

  getActiveSession() {
    return this.sessionRepository.getActiveSession();
  }

  refreshActiveSession() {
    let active = this.sessionRepository.getActiveSession();
    if (!active) {
      active = this.sessionRepository.ensureSession();
    }
    if (!active) {
      return null;
    }
    return this.setSession(active);
  }

  load({ onFirstLoad, onReturning, onError } = {}) {
    this.refreshActiveSession();
    const defaultState = this.buildDefaultState();
    this.initializeState(defaultState);

    const lastSavedFallback = this.now();
    const fallback = () => this.initializeDefaultState(onFirstLoad, lastSavedFallback);

    const context = this.createMigrationContext(defaultState);
    const pipeline = this.readSnapshot(onError)
      .chain(raw => this.parseSnapshot(raw, onError))
      .chain(parsed => this.migrateSnapshot(parsed, context, onError));

    if (!pipeline.isSuccess) {
      return fallback();
    }

    const migrated = pipeline.value;

    const merged = this.mergeWithDefault(defaultState, migrated);
    const lastSaved = Number.isFinite(merged.lastSaved) ? merged.lastSaved : this.now();
    const migratedVersion = Number.isInteger(migrated.version) ? migrated.version : 0;
    const effectiveVersion = Math.max(this.version, migratedVersion);
    merged.lastSaved = lastSaved;
    merged.version = effectiveVersion;

    this.replaceState(merged);
    const state = this.getState();
    state.lastSaved = lastSaved;
    state.version = effectiveVersion;
    this.sessionRepository.updateSession(this.session.id, { lastSaved });
    this.ensureStateShape(state);
    this.ensureNicheEvents(state);
    syncNicheTrendSnapshots(state);

    if (typeof onReturning === 'function') {
      onReturning({ state, lastSaved });
    }

    return { state, returning: true, lastSaved };
  }

  readSnapshot(onError) {
    const result = this.repository.loadRaw();
    if (result.type === 'success') {
      return success(result.value);
    }
    if (result.type === 'empty') {
      return empty();
    }
    this.handleLoadFailure('Failed to read saved state', result.error, onError);
    return error(result.error);
  }

  parseSnapshot(raw, onError) {
    return tryCatch(() => JSON.parse(raw)).mapError(err => {
      this.handleLoadFailure('Failed to parse saved state', err, onError);
      return err;
    });
  }

  migrateSnapshot(parsed, context, onError) {
    return tryCatch(() => this.migrationRunner.run(parsed, context)).mapError(err => {
      this.handleLoadFailure('Failed to migrate saved state', err, onError);
      return err;
    });
  }

  handleLoadFailure(message, error, onError) {
    this.logger?.error?.(message, error);
    if (typeof onError === 'function') {
      onError(error);
    }
  }

  initializeDefaultState(onFirstLoad, lastSavedFallback) {
    const state = this.getState();
    const initialVersion = Number.isInteger(state.version) ? state.version : 0;
    state.version = Math.max(this.version, initialVersion);
    state.lastSaved = lastSavedFallback;
    this.sessionRepository.updateSession(this.session.id, { lastSaved: lastSavedFallback });
    this.ensureStateShape(state);
    this.ensureNicheEvents(state);
    syncNicheTrendSnapshots(state);

    if (typeof onFirstLoad === 'function') {
      onFirstLoad({ state, lastSaved: state.lastSaved });
    }

    return { state, returning: false, lastSaved: state.lastSaved };
  }

  save() {
    this.refreshActiveSession();
    const state = this.getState();
    if (!state) return null;
    this.ensureStateShape(state);
    syncNicheTrendSnapshots(state);
    const snapshot = this.clone(state);
    const lastSaved = this.now();
    const stateVersion = Number.isInteger(state.version) ? state.version : 0;
    const effectiveVersion = Math.max(this.version, stateVersion);
    snapshot.lastSaved = lastSaved;
    snapshot.version = effectiveVersion;
    state.lastSaved = lastSaved;
    state.version = effectiveVersion;
    const saveResult = this.repository.saveRaw(JSON.stringify(snapshot));
    if (saveResult.type === 'error') {
      this.logger?.error?.('Failed to save game', saveResult.error);
      return null;
    }
    this.sessionRepository.updateSession(this.session.id, { lastSaved });
    return { lastSaved };
  }

  mergeWithDefault(defaultState, snapshot) {
    const base = this.clone(defaultState);
    const merged = {
      ...base,
      ...snapshot,
      actions: {
        ...(defaultState.actions ? this.clone(defaultState.actions) : {}),
        ...(snapshot.actions || {})
      },
      hustles: {
        ...this.clone(defaultState.hustles),
        ...(snapshot.hustles || {})
      },
      assets: {
        ...this.clone(defaultState.assets),
        ...(snapshot.assets || {})
      },
      upgrades: {
        ...this.clone(defaultState.upgrades),
        ...(snapshot.upgrades || {})
      },
      log: Array.isArray(snapshot.log) ? snapshot.log : []
    };
    return merged;
  }

  createMigrationContext(defaultState) {
    return {
      defaultState: this.clone(defaultState),
      clone: this.clone,
      now: this.now,
      version: this.version,
      stateAccess: this.stateAccess
    };
  }
}
