import { SnapshotRepository } from './snapshotRepository.js';
import { StateMigrationRunner } from './stateMigrationRunner.js';

function isObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeMetadata(metadata) {
  if (!isObject(metadata)) {
    return {};
  }
  return { ...metadata };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function markMigrationAborted(index) {
  if (!isObject(index)) {
    return;
  }
  const previousVersion = Number.isInteger(index.version) ? index.version : 0;
  try {
    Object.defineProperty(index, '__skipVersionUpdate', {
      value: true,
      configurable: true
    });
    Object.defineProperty(index, '__previousVersion', {
      value: previousVersion,
      configurable: true
    });
  } catch (error) {
    index.__skipVersionUpdate = true;
    index.__previousVersion = previousVersion;
  }
}

function safeParseJSON(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console?.error?.('Failed to parse JSON value', error);
    return null;
  }
}

function migrateLegacySingleSlotIndex(index, context = {}) {
  const working = context.clone?.(index) ?? { ...index };
  const sessions = isObject(working.sessions) ? working.sessions : {};
  working.sessions = sessions;

  if (Object.keys(sessions).length > 0) {
    return working;
  }

  const storage = context.storage;
  const baseStorageKey = context.baseStorageKey;
  if (!storage || !baseStorageKey) {
    return working;
  }

  let legacyRaw;
  try {
    legacyRaw = storage.getItem(baseStorageKey);
  } catch (error) {
    console?.error?.('Failed to inspect legacy session storage', error);
    markMigrationAborted(working);
    return working;
  }

  if (legacyRaw == null) {
    return working;
  }

  const snapshot = safeParseJSON(legacyRaw);
  const sessionId =
    typeof context.defaultSessionId === 'function'
      ? context.defaultSessionId()
      : 'default';
  const sessionName =
    typeof context.defaultSessionName === 'function'
      ? context.defaultSessionName()
      : 'Main Hustle';
  const storageKey =
    typeof context.createSessionStorageKey === 'function'
      ? context.createSessionStorageKey(sessionId)
      : `${baseStorageKey}:session:${sessionId}`;

  const lastSaved = Number.isFinite(snapshot?.lastSaved) ? Number(snapshot.lastSaved) : null;
  const metadataSource = isObject(snapshot?.sessionMetadata)
    ? snapshot.sessionMetadata
    : isObject(snapshot?.metadata)
    ? snapshot.metadata
    : null;
  const metadata = isObject(metadataSource) ? metadataSource : undefined;

  const sessionEntry = context.buildSession
    ? context.buildSession({
        id: sessionId,
        name: sessionName,
        storageKey,
        metadata,
        lastSaved
      })
    : {
        id: sessionId,
        name: sessionName,
        storageKey,
        metadata: metadata ?? {},
        lastSaved
      };

  const migrated = context.createEmptyIndex ? context.createEmptyIndex() : { version: 0, activeSessionId: null, sessions: {} };
  if (storageKey !== baseStorageKey) {
    try {
      storage.setItem(storageKey, legacyRaw);
    } catch (error) {
      console?.error?.('Failed to migrate legacy session snapshot', error);
      markMigrationAborted(working);
      return working;
    }
    try {
      storage.removeItem(baseStorageKey);
    } catch (error) {
      console?.error?.('Failed to remove legacy session snapshot', error);
    }
  }

  migrated.sessions[sessionEntry.id] = sessionEntry;
  migrated.activeSessionId = sessionEntry.id;

  return migrated;
}

const DEFAULT_INDEX_MIGRATIONS = [migrateLegacySingleSlotIndex];

export class SessionRepository {
  constructor({ storageKey, storage = globalThis?.localStorage, indexMigrations = DEFAULT_INDEX_MIGRATIONS } = {}) {
    this.baseStorageKey = storageKey;
    this.storage = storage;
    this.indexStorageKey = storageKey ? `${storageKey}:sessions` : undefined;
    this.indexCache = null;
    this.indexCacheRaw = null;
    this.indexMigrationRunner = new StateMigrationRunner({ migrations: indexMigrations });
  }

  get storageKey() {
    return this.baseStorageKey;
  }

  set storageKey(value) {
    this.baseStorageKey = value;
    this.indexStorageKey = value ? `${value}:sessions` : undefined;
    this.indexCache = null;
    this.indexCacheRaw = null;
  }

  defaultSessionId() {
    return 'default';
  }

  defaultSessionName() {
    return 'Main Hustle';
  }

  generateSessionId() {
    const cryptoObj = globalThis?.crypto;
    if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
      try {
        return cryptoObj.randomUUID();
      } catch (error) {
        console?.error?.('Failed to generate session id via randomUUID', error);
      }
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  createSessionStorageKey(id) {
    if (!this.baseStorageKey) {
      return id;
    }
    return `${this.baseStorageKey}:session:${id}`;
  }

  buildSession({ id, name, storageKey, metadata, lastSaved }) {
    const resolvedId = `${id}`;
    return {
      id: resolvedId,
      name: name || this.defaultSessionName(),
      storageKey: storageKey || this.createSessionStorageKey(resolvedId),
      metadata: sanitizeMetadata(metadata),
      lastSaved: Number.isFinite(lastSaved) ? Number(lastSaved) : null
    };
  }

  createEmptyIndex() {
    return { version: 0, activeSessionId: null, sessions: {} };
  }

  cloneIndex(value) {
    return clone(value);
  }

  applyIndexMigrations(index) {
    if (!this.indexMigrationRunner) {
      return { index, dirty: false };
    }
    const source = isObject(index) ? index : this.createEmptyIndex();
    const baseline = this.cloneIndex(source);
    const baselineSerialized = JSON.stringify(baseline);
    const context = {
      version: this.indexMigrationRunner.version,
      storage: this.storage,
      baseStorageKey: this.baseStorageKey,
      indexStorageKey: this.indexStorageKey,
      defaultSessionId: () => this.defaultSessionId(),
      defaultSessionName: () => this.defaultSessionName(),
      createSessionStorageKey: id => this.createSessionStorageKey(id),
      buildSession: descriptor => this.buildSession(descriptor),
      createEmptyIndex: () => this.createEmptyIndex(),
      clone: value => this.cloneIndex(value)
    };
    const migrated = this.indexMigrationRunner.run(baseline, context);
    const migratedSerialized = JSON.stringify(migrated);
    return { index: migrated, dirty: baselineSerialized !== migratedSerialized };
  }

  ensureIndexVersion(index) {
    const target = this.indexMigrationRunner?.version ?? 0;
    if (!isObject(index)) {
      return index;
    }

    if (index.__skipVersionUpdate) {
      const previousVersion = Number.isInteger(index.__previousVersion)
        ? index.__previousVersion
        : Number.isInteger(index.version)
        ? index.version
        : 0;
      delete index.__skipVersionUpdate;
      delete index.__previousVersion;
      index.version = previousVersion;
      return index;
    }

    const current = Number.isInteger(index.version) ? index.version : 0;
    if (current < target) {
      index.version = target;
    }
    return index;
  }

  loadIndexFromStorage({ raw } = {}) {
    if (!this.storage || !this.indexStorageKey) {
      const emptyIndex = this.createEmptyIndex();
      const { index } = this.applyIndexMigrations(emptyIndex);
      this.ensureIndexVersion(index);
      return { index, raw: null };
    }

    let rawValue = raw;
    if (rawValue === undefined) {
      try {
        rawValue = this.storage.getItem(this.indexStorageKey);
      } catch (error) {
        console?.error?.('Failed to read session index', error);
        return { index: this.createEmptyIndex(), raw: null };
      }
    }

    let index = this.createEmptyIndex();

    if (rawValue) {
      const parsed = safeParseJSON(rawValue);
      if (isObject(parsed)) {
        const sessions = isObject(parsed.sessions) ? parsed.sessions : {};
        const sanitizedSessions = {};
        for (const [id, entry] of Object.entries(sessions)) {
          if (!isObject(entry)) continue;
          sanitizedSessions[id] = this.buildSession({
            id,
            name: entry.name,
            storageKey: entry.storageKey || this.createSessionStorageKey(id),
            metadata: entry.metadata,
            lastSaved: entry.lastSaved
          });
        }
        const activeSessionId =
          typeof parsed.activeSessionId === 'string' && sanitizedSessions[parsed.activeSessionId]
            ? parsed.activeSessionId
            : null;
        const version = Number.isInteger(parsed.version) ? parsed.version : 0;
        index = { version, activeSessionId, sessions: sanitizedSessions };
      }
    }

    const { index: migrated, dirty } = this.applyIndexMigrations(index);
    this.ensureIndexVersion(migrated);
    if (dirty) {
      const serialized = this.persistIndex(migrated);
      rawValue = serialized ?? rawValue ?? JSON.stringify(migrated);
    }
    return { index: migrated, raw: rawValue ?? null };
  }

  persistIndex(index) {
    if (!this.storage || !this.indexStorageKey) {
      return null;
    }
    try {
      const serialized = JSON.stringify(index);
      this.storage.setItem(this.indexStorageKey, serialized);
      return serialized;
    } catch (error) {
      console?.error?.('Failed to persist session index', error);
      return null;
    }
  }

  getIndex() {
    if (!this.indexCache) {
      const { index, raw } = this.loadIndexFromStorage();
      this.indexCache = index;
      this.indexCacheRaw = raw;
      return this.indexCache;
    }

    if (this.storage && this.indexStorageKey) {
      try {
        const raw = this.storage.getItem(this.indexStorageKey);
        if (!raw) {
          const emptyIndex = this.createEmptyIndex();
          const { index: migrated, dirty } = this.applyIndexMigrations(emptyIndex);
          this.ensureIndexVersion(migrated);
          this.indexCache = migrated;
          if (dirty) {
            const serialized = this.persistIndex(migrated);
            this.indexCacheRaw = serialized ?? raw ?? null;
          } else {
            this.indexCacheRaw = raw ?? null;
          }
        } else if (raw !== this.indexCacheRaw) {
          const { index, raw: normalizedRaw } = this.loadIndexFromStorage({ raw });
          this.indexCache = index;
          this.indexCacheRaw = normalizedRaw ?? raw;
        }
      } catch (error) {
        console?.error?.('Failed to refresh session index', error);
        this.indexCacheRaw = undefined;
      }
    }
    return this.indexCache;
  }

  setIndex(index) {
    const normalized = this.normalizeIndex(index);
    this.ensureIndexVersion(normalized);
    this.indexCache = normalized;
    const serialized = this.persistIndex(normalized);
    this.indexCacheRaw = serialized;
    return this.indexCache;
  }

  normalizeIndex(index) {
    const working = this.createEmptyIndex();
    if (!isObject(index)) {
      return working;
    }
    working.sessions = { ...working.sessions, ...index.sessions };
    if (Number.isInteger(index.version)) {
      working.version = index.version;
    }
    if (index.activeSessionId && working.sessions[index.activeSessionId]) {
      working.activeSessionId = index.activeSessionId;
    }
    return working;
  }

  listSessions() {
    const index = this.getIndex();
    return Object.values(index.sessions).map(entry => clone(entry));
  }

  maybeAdoptLegacySnapshot(session) {
    if (
      !session ||
      !this.storage ||
      !this.baseStorageKey ||
      session.storageKey === this.baseStorageKey ||
      Number.isFinite(session.lastSaved)
    ) {
      return session;
    }
    try {
      const legacyValue = this.storage.getItem(this.baseStorageKey);
      if (legacyValue == null) {
        return session;
      }
      const currentValue = session.storageKey ? this.storage.getItem(session.storageKey) : null;
      if (currentValue != null) {
        return session;
      }
      const updated = this.updateSession(session.id, { storageKey: this.baseStorageKey });
      return updated ?? session;
    } catch (error) {
      console?.error?.('Failed to inspect legacy session snapshot', error);
      return session;
    }
  }

  getSession(id) {
    if (!id) return null;
    const index = this.getIndex();
    const session = index.sessions[id];
    if (!session) {
      return null;
    }
    const resolved = this.maybeAdoptLegacySnapshot(session) || session;
    return clone(resolved);
  }

  getActiveSession() {
    const index = this.getIndex();
    if (!index.activeSessionId) {
      return null;
    }
    const session = index.sessions[index.activeSessionId];
    if (!session) {
      return null;
    }
    const resolved = this.maybeAdoptLegacySnapshot(session) || session;
    return clone(resolved);
  }

  ensureSession(descriptor = {}) {
    if (descriptor && typeof descriptor === 'object' && descriptor.id) {
      return this.setActiveSession(descriptor);
    }

    const index = this.getIndex();
    if (index.activeSessionId && index.sessions[index.activeSessionId]) {
      return clone(index.sessions[index.activeSessionId]);
    }

    const fallbackId = Object.keys(index.sessions)[0];
    if (fallbackId) {
      return this.setActiveSession({ id: fallbackId });
    }

    return this.createSession(
      {
        id: this.defaultSessionId(),
        name: this.defaultSessionName(),
        storageKey: this.resolveLegacyStorageKey()
      },
      { setActive: true }
    );
  }

  resolveLegacyStorageKey() {
    if (!this.storage || !this.baseStorageKey) {
      return this.createSessionStorageKey(this.defaultSessionId());
    }
    try {
      const legacyValue = this.storage.getItem(this.baseStorageKey);
      if (legacyValue == null) {
        return this.createSessionStorageKey(this.defaultSessionId());
      }
      return this.baseStorageKey;
    } catch (error) {
      console?.error?.('Failed to read legacy session snapshot', error);
      return this.createSessionStorageKey(this.defaultSessionId());
    }
  }

  createSession(descriptor = {}, { setActive = true } = {}) {
    const id = descriptor.id || this.generateSessionId();
    const session = this.buildSession({
      id,
      name: descriptor.name,
      storageKey: descriptor.storageKey || this.createSessionStorageKey(id),
      metadata: descriptor.metadata,
      lastSaved: descriptor.lastSaved
    });
    const index = clone(this.getIndex());
    index.sessions[session.id] = session;
    if (setActive || !index.activeSessionId) {
      index.activeSessionId = session.id;
    }
    this.setIndex(index);
    return clone(session);
  }

  renameSession(id, name) {
    if (!id || typeof name !== 'string') {
      return this.getSession(id);
    }
    const index = clone(this.getIndex());
    const session = index.sessions[id];
    if (!session) {
      return null;
    }
    session.name = name;
    this.setIndex(index);
    return clone(session);
  }

  updateSession(id, updates = {}) {
    if (!id || !isObject(updates)) {
      return this.getSession(id);
    }
    const index = clone(this.getIndex());
    const session = index.sessions[id];
    if (!session) {
      return null;
    }
    if (updates.name && typeof updates.name === 'string') {
      session.name = updates.name;
    }
    if (updates.metadata && isObject(updates.metadata)) {
      session.metadata = { ...session.metadata, ...updates.metadata };
    }
    if (updates.storageKey && typeof updates.storageKey === 'string') {
      session.storageKey = updates.storageKey;
    }
    if (updates.lastSaved != null) {
      session.lastSaved = Number.isFinite(updates.lastSaved) ? Number(updates.lastSaved) : null;
    }
    this.setIndex(index);
    return clone(session);
  }

  setActiveSession(descriptor) {
    const id = typeof descriptor === 'string' ? descriptor : descriptor?.id;
    if (!id) {
      return this.ensureSession();
    }
    const index = clone(this.getIndex());
    let session = index.sessions[id];
    if (!session) {
      session = this.buildSession({
        id,
        name: descriptor?.name,
        storageKey: descriptor?.storageKey || this.createSessionStorageKey(id),
        metadata: descriptor?.metadata,
        lastSaved: descriptor?.lastSaved
      });
    } else if (descriptor && typeof descriptor === 'object') {
      if (descriptor.name && descriptor.name !== session.name) {
        session.name = descriptor.name;
      }
      if (isObject(descriptor.metadata)) {
        session.metadata = { ...session.metadata, ...descriptor.metadata };
      }
      if (descriptor.storageKey && descriptor.storageKey !== session.storageKey) {
        session.storageKey = descriptor.storageKey;
      }
      if (descriptor.lastSaved != null) {
        session.lastSaved = Number.isFinite(descriptor.lastSaved) ? Number(descriptor.lastSaved) : null;
      }
    }
    index.sessions[id] = session;
    index.activeSessionId = id;
    this.setIndex(index);
    return clone(session);
  }

  deleteSession(id) {
    if (!id) {
      return { removed: null, nextSession: this.ensureSession() };
    }
    const index = clone(this.getIndex());
    const session = index.sessions[id];
    if (!session) {
      return { removed: null, nextSession: this.ensureSession() };
    }
    delete index.sessions[id];
    if (index.activeSessionId === id) {
      index.activeSessionId = null;
    }
    this.setIndex(index);
    if (session.storageKey) {
      try {
        this.storage?.removeItem?.(session.storageKey);
      } catch (error) {
        console?.error?.('Failed to remove session snapshot', error);
      }
    }
    const nextSession = this.ensureSession();
    return { removed: clone(session), nextSession };
  }

  resolveSnapshotKey(id) {
    const session = this.getSession(id);
    if (session?.storageKey) {
      return session.storageKey;
    }
    return this.createSessionStorageKey(id);
  }

  createSnapshotRepository(sessionId) {
    const storageKey = this.resolveSnapshotKey(sessionId);
    return new SnapshotRepository({ storageKey, storage: this.storage });
  }
}
