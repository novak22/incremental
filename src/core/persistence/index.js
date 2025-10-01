import { getAssetDefinition } from '../state/registry.js';
import { createAssetInstance } from '../state/assets.js';
import { getAssetState, getUpgradeState } from '../state.js';

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

  if (snapshot.blog) {
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

  if (snapshot.assistantHired) {
    const assistant = getUpgradeState('assistant', migrated);
    assistant.count = Math.max(1, Number(assistant.count) || 0);
  }

  getUpgradeState('coffee', migrated).usedToday = snapshot.coffeesToday || 0;

  migrated.log = Array.isArray(snapshot.log) ? snapshot.log : [];
  return migrated;
}

const DEFAULT_MIGRATIONS = [migrateLegacySnapshot];

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
    migrations = DEFAULT_MIGRATIONS,
    logger = console
  }) {
    this.storageKey = storageKey;
    this.storage = storage;
    this.clone = clone;
    this.now = now;
    this.buildDefaultState = buildDefaultState;
    this.initializeState = initializeState;
    this.replaceState = replaceState;
    this.ensureStateShape = ensureStateShape;
    this.getState = getState;
    this.migrations = migrations;
    this.version = Array.isArray(migrations) ? migrations.length : 0;
    this.logger = logger;
  }

  load({ onFirstLoad, onReturning, onError } = {}) {
    const defaultState = this.buildDefaultState();
    this.initializeState(defaultState);

    const lastSavedFallback = this.now();
    const fallback = () => this.initializeDefaultState(onFirstLoad, lastSavedFallback);

    const readSnapshotRaw = onErrorCallback => {
      let rawSnapshot = null;
      try {
        rawSnapshot = this.storage?.getItem(this.storageKey) ?? null;
      } catch (err) {
        this.logger?.error?.('Failed to read saved state', err);
        if (typeof onErrorCallback === 'function') {
          onErrorCallback(err);
        }
        return { ok: false, result: fallback() };
      }

      if (!rawSnapshot) {
        return { ok: false, result: fallback() };
      }

      return { ok: true, value: rawSnapshot };
    };

    const parseSnapshot = (raw, onErrorCallback) => {
      try {
        return { ok: true, value: JSON.parse(raw) };
      } catch (err) {
        this.logger?.error?.('Failed to parse saved state', err);
        if (typeof onErrorCallback === 'function') {
          onErrorCallback(err);
        }
        return { ok: false, result: fallback() };
      }
    };

    const migrateSnapshot = (parsed, context, onErrorCallback) => {
      try {
        return { ok: true, value: this.migrate(parsed, context) };
      } catch (err) {
        this.logger?.error?.('Failed to migrate saved state', err);
        if (typeof onErrorCallback === 'function') {
          onErrorCallback(err);
        }
        return { ok: false, result: fallback() };
      }
    };

    const rawResult = readSnapshotRaw(onError);
    if (!rawResult.ok) {
      return rawResult.result;
    }

    const parsedResult = parseSnapshot(rawResult.value, onError);
    if (!parsedResult.ok) {
      return parsedResult.result;
    }

    const context = this.createMigrationContext(defaultState);
    const migratedResult = migrateSnapshot(parsedResult.value, context, onError);
    if (!migratedResult.ok) {
      return migratedResult.result;
    }

    const migrated = migratedResult.value;

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
    this.ensureStateShape(state);

    if (typeof onReturning === 'function') {
      onReturning({ state, lastSaved });
    }

    return { state, returning: true, lastSaved };
  }

  initializeDefaultState(onFirstLoad, lastSavedFallback) {
    const state = this.getState();
    const initialVersion = Number.isInteger(state.version) ? state.version : 0;
    state.version = Math.max(this.version, initialVersion);
    state.lastSaved = lastSavedFallback;
    this.ensureStateShape(state);

    if (typeof onFirstLoad === 'function') {
      onFirstLoad({ state, lastSaved: state.lastSaved });
    }

    return { state, returning: false, lastSaved: state.lastSaved };
  }

  save() {
    const state = this.getState();
    if (!state) return null;
    const snapshot = this.clone(state);
    const lastSaved = this.now();
    const stateVersion = Number.isInteger(state.version) ? state.version : 0;
    const effectiveVersion = Math.max(this.version, stateVersion);
    snapshot.lastSaved = lastSaved;
    snapshot.version = effectiveVersion;
    state.lastSaved = lastSaved;
    state.version = effectiveVersion;
    try {
      this.storage?.setItem(this.storageKey, JSON.stringify(snapshot));
    } catch (err) {
      this.logger?.error?.('Failed to save game', err);
      return null;
    }
    return { lastSaved };
  }

  migrate(snapshot, context) {
    if (!snapshot || typeof snapshot !== 'object') {
      return context.clone(context.defaultState);
    }

    if (!Array.isArray(this.migrations) || !this.migrations.length) {
      return { ...snapshot };
    }

    let current = { ...snapshot };
    const startVersion = Number.isInteger(current.version) ? current.version : 0;
    if (startVersion < this.version) {
      for (let index = Math.max(0, startVersion); index < this.migrations.length; index += 1) {
        const step = this.migrations[index];
        if (typeof step !== 'function') continue;
        current = step(current, context);
        if (!current || typeof current !== 'object') {
          throw new Error(`Migration at index ${index} did not return an object.`);
        }
      }
    }

    current.version = Math.max(this.version, startVersion);
    return current;
  }

  mergeWithDefault(defaultState, snapshot) {
    const base = this.clone(defaultState);
    const merged = {
      ...base,
      ...snapshot,
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
      version: this.version
    };
  }
}

