import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SnapshotRepository,
  StateMigrationRunner,
  StatePersistence,
  SessionRepository
} from '../src/core/persistence/index.js';
import {
  success,
  error as errorResult,
  empty as emptyResult,
  tryCatch
} from '../src/core/persistence/result.js';

function createPersistence({ storage, migrations = [] } = {}) {
  let state;
  const nowValue = 123456789;
  const clone = value => JSON.parse(JSON.stringify(value));
  const baseState = () => ({
    money: 0,
    log: [],
    hustles: {},
    assets: {},
    upgrades: {},
    lastSaved: 0,
    version: 0
  });

  const effectiveStorage = {
    getItem: storage?.getItem?.bind(storage) ?? (() => null),
    setItem: storage?.setItem?.bind(storage) ?? (() => {}),
    removeItem: storage?.removeItem?.bind(storage) ?? (() => {})
  };

  const repository = new SnapshotRepository({
    storageKey: 'test-key',
    storage: effectiveStorage
  });
  const migrationRunner = new StateMigrationRunner({ migrations });

  const persistence = new StatePersistence({
    storageKey: 'test-key',
    storage: effectiveStorage,
    clone,
    now: () => nowValue,
    buildDefaultState: () => baseState(),
    initializeState: defaultState => {
      state = clone(defaultState);
      return state;
    },
    replaceState: nextState => {
      state = nextState;
      return state;
    },
    ensureStateShape: () => {},
    getState: () => state,
    getAssetState: () => ({ instances: [] }),
    getUpgradeState: () => ({}),
    logger: { error: () => {} },
    repository,
    migrationRunner
  });

  return { persistence, getState: () => state, nowValue };
}

test('load falls back to defaults when storage is empty', () => {
  const storage = { getItem: () => null };
  const { persistence, getState, nowValue } = createPersistence({ storage });
  let onFirstLoadCalled = false;
  persistence.parseSnapshot = () => {
    throw new Error('parseSnapshot should not run when storage is empty');
  };
  persistence.migrateSnapshot = () => {
    throw new Error('migrateSnapshot should not run when storage is empty');
  };
  const errors = [];

  const result = persistence.load({
    onError: error => errors.push(error),
    onFirstLoad: ({ state, lastSaved }) => {
      onFirstLoadCalled = true;
      assert.equal(state, getState());
      assert.equal(lastSaved, nowValue);
    }
  });

  assert.equal(result.returning, false);
  assert.equal(getState().lastSaved, nowValue);
  assert.ok(onFirstLoadCalled);
  assert.equal(errors.length, 0);
});

test('load reports errors when storage read fails', () => {
  const storageError = new Error('read failed');
  const storage = {
    getItem: () => {
      throw storageError;
    }
  };
  const { persistence, getState, nowValue } = createPersistence({ storage });
  const errors = [];

  const result = persistence.load({
    onError: error => errors.push(error)
  });

  assert.equal(result.returning, false);
  assert.equal(getState().lastSaved, nowValue);
  assert.equal(errors.length, 1);
  assert.equal(errors[0], storageError);
});

test('load reports errors when parsing fails', () => {
  const storage = { getItem: () => '{ invalid json' };
  const { persistence, getState, nowValue } = createPersistence({ storage });
  const errors = [];

  const result = persistence.load({
    onError: error => errors.push(error)
  });

  assert.equal(result.returning, false);
  assert.equal(getState().lastSaved, nowValue);
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /JSON/);
});

test('load reports errors when migration fails', () => {
  const storage = {
    getItem: () => JSON.stringify({ version: 0, hustles: {}, assets: {}, upgrades: {}, log: [] })
  };
  const migrationError = new Error('migration failed');
  const migrations = [() => {
    throw migrationError;
  }];
  const { persistence, getState, nowValue } = createPersistence({ storage, migrations });
  const errors = [];

  const result = persistence.load({
    onError: error => errors.push(error)
  });

  assert.equal(result.returning, false);
  assert.equal(getState().lastSaved, nowValue);
  assert.equal(errors.length, 1);
  assert.equal(errors[0], migrationError);
});

test('load returns migrated state for returning players', () => {
  const snapshot = {
    money: 42,
    version: 0,
    lastSaved: 987654,
    hustles: { a: { progress: 1 } },
    assets: { b: { owned: 2 } },
    upgrades: { c: { level: 3 } },
    log: ['entry']
  };
  const storage = {
    getItem: () => JSON.stringify(snapshot)
  };
  const { persistence, getState } = createPersistence({ storage });
  let onReturningCalled = false;

  const result = persistence.load({
    onReturning: ({ state, lastSaved }) => {
      onReturningCalled = true;
      assert.equal(state, getState());
      assert.equal(lastSaved, snapshot.lastSaved);
    }
  });

  assert.equal(result.returning, true);
  assert.equal(result.lastSaved, snapshot.lastSaved);
  assert.equal(getState().money, 42);
  assert.ok(onReturningCalled);
});

test('result helper composes map and chain operations', () => {
  const doubled = success(5)
    .map(value => value * 2)
    .chain(value => success(value + 3));

  assert.equal(doubled.type, 'success');
  assert.equal(doubled.value, 13);

  const failed = success(5)
    .chain(() => errorResult(new Error('nope')))
    .map(() => 100);

  assert.equal(failed.type, 'error');
  assert.match(failed.error.message, /nope/);

  const emptyChain = emptyResult()
    .chain(() => success(10))
    .map(() => 99);

  assert.equal(emptyChain.type, 'empty');

  const guarded = tryCatch(() => JSON.parse('{ bad json'));
  assert.equal(guarded.type, 'error');
  assert.ok(guarded.error instanceof Error);
});

test('legacy session migration retries when snapshot copy fails', () => {
  const storageKey = 'legacy-session';
  const defaultSessionKey = `${storageKey}:session:default`;
  const indexKey = `${storageKey}:sessions`;
  const legacySnapshot = JSON.stringify({
    lastSaved: 987654321,
    sessionMetadata: { vibe: 'focused' }
  });

  const store = new Map([[storageKey, legacySnapshot]]);
  let shouldFailCopy = true;
  const storage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      if (key === defaultSessionKey && shouldFailCopy) {
        shouldFailCopy = false;
        throw new Error('quota exceeded');
      }
      store.set(key, value);
    },
    removeItem: key => {
      store.delete(key);
    }
  };

  const repository = new SessionRepository({ storageKey, storage });

  const firstIndex = repository.getIndex();
  assert.equal(firstIndex.version, 0);
  assert.deepEqual(firstIndex.sessions, {});
  assert.equal(store.has(defaultSessionKey), false);
  assert.ok(store.has(storageKey));

  repository.indexCache = null;
  repository.indexCacheRaw = null;

  const secondIndex = repository.getIndex();
  const sessionId = repository.defaultSessionId();
  assert.equal(secondIndex.version, repository.indexMigrationRunner.version);
  assert.ok(secondIndex.sessions[sessionId]);
  assert.equal(secondIndex.sessions[sessionId].storageKey, defaultSessionKey);
  assert.equal(secondIndex.sessions[sessionId].lastSaved, 987654321);
  assert.equal(store.has(storageKey), false);
  assert.ok(store.has(defaultSessionKey));
  assert.ok(store.has(indexKey));
});

