import { SnapshotRepository } from './snapshotRepository.js';

function isObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeMetadata(metadata) {
  if (!isObject(metadata)) {
    return {};
  }
  return { ...metadata };
}

export class SessionRepository {
  constructor({ storageKey, storage = globalThis?.localStorage } = {}) {
    this.baseStorageKey = storageKey;
    this.storage = storage;
    this.indexStorageKey = storageKey ? `${storageKey}:sessions` : undefined;
    this.indexCache = null;
    this.indexCacheRaw = null;
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
    return { activeSessionId: null, sessions: {} };
  }

  loadIndexFromStorage({ raw } = {}) {
    if (!this.storage || !this.indexStorageKey) {
      return { index: this.createEmptyIndex(), raw: null };
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

    if (!rawValue) {
      return { index: this.createEmptyIndex(), raw: rawValue ?? null };
    }

    try {
      const parsed = JSON.parse(rawValue);
      if (!isObject(parsed)) {
        return { index: this.createEmptyIndex(), raw: rawValue };
      }
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
      return { index: { activeSessionId, sessions: sanitizedSessions }, raw: rawValue };
    } catch (error) {
      console?.error?.('Failed to parse session index', error);
      return { index: this.createEmptyIndex(), raw: rawValue ?? null };
    }
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
          this.indexCache = this.createEmptyIndex();
          this.indexCacheRaw = raw ?? null;
        } else if (raw !== this.indexCacheRaw) {
          const { index } = this.loadIndexFromStorage({ raw });
          this.indexCache = index;
          this.indexCacheRaw = raw;
        }
      } catch (error) {
        console?.error?.('Failed to refresh session index', error);
        this.indexCache = this.createEmptyIndex();
        this.indexCacheRaw = null;
      }
    }
    return this.indexCache;
  }

  setIndex(index) {
    const normalized = this.normalizeIndex(index);
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
