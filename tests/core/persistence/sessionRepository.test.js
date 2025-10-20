import test from 'node:test';
import assert from 'node:assert/strict';

import { SessionRepository } from '../../../src/core/persistence/sessionRepository.js';

function createMockStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test('ensureSession migrates legacy snapshot data into the default slot', () => {
  const legacySnapshot = JSON.stringify({
    lastSaved: 987654321,
    sessionMetadata: { branch: 'exp-a' }
  });
  const storage = createMockStorage({ 'sim-key': legacySnapshot });
  const repository = new SessionRepository({ storageKey: 'sim-key', storage });

  const session = repository.ensureSession();

  assert.equal(session.id, 'default');
  assert.equal(session.storageKey, 'sim-key:session:default');
  assert.equal(session.lastSaved, 987654321);
  assert.deepEqual(session.metadata, { branch: 'exp-a' });

  const index = repository.getIndex();
  assert.equal(index.activeSessionId, 'default');
  assert.ok(index.sessions.default, 'expected default session to be recorded in the index');
  assert.equal(storage.values.has('sim-key'), false, 'legacy key should be pruned during migration');
  assert.equal(
    storage.values.has('sim-key:session:default'),
    true,
    'migrated snapshot should be copied to the per-session storage key'
  );
});

test('deleteSession removes the snapshot and activates the next available slot', () => {
  const index = {
    version: 1,
    activeSessionId: 'alpha',
    sessions: {
      alpha: { id: 'alpha', name: 'Alpha Run', storageKey: 'sim:session:alpha', metadata: {}, lastSaved: 111 },
      beta: { id: 'beta', name: 'Beta Run', storageKey: 'sim:session:beta', metadata: {}, lastSaved: 222 }
    }
  };
  const storage = createMockStorage({
    'sim:sessions': JSON.stringify(index),
    'sim:session:alpha': JSON.stringify({ foo: 'a' }),
    'sim:session:beta': JSON.stringify({ foo: 'b' })
  });

  const repository = new SessionRepository({ storageKey: 'sim', storage });
  const result = repository.deleteSession('alpha');

  assert.equal(result.removed?.id, 'alpha');
  assert.equal(result.nextSession?.id, 'beta');
  assert.equal(storage.values.has('sim:session:alpha'), false, 'removed slot snapshot should be cleared');

  const refreshedIndex = repository.getIndex();
  assert.equal(refreshedIndex.activeSessionId, 'beta');
  assert.ok(!('alpha' in refreshedIndex.sessions));
});

test('setActiveSession merges updates into an existing slot and marks it active', () => {
  const index = {
    version: 2,
    activeSessionId: 'alpha',
    sessions: {
      alpha: { id: 'alpha', name: 'Alpha Run', storageKey: 'sim:session:alpha', metadata: {}, lastSaved: 333 },
      beta: { id: 'beta', name: 'Beta Run', storageKey: 'sim:session:beta', metadata: { world: 'prime' }, lastSaved: 444 }
    }
  };
  const storage = createMockStorage({ 'sim:sessions': JSON.stringify(index) });
  const repository = new SessionRepository({ storageKey: 'sim', storage });

  const updated = repository.setActiveSession({
    id: 'beta',
    name: 'Beta Prime',
    metadata: { season: 'winter' },
    lastSaved: 555
  });

  assert.equal(updated.id, 'beta');
  assert.equal(updated.name, 'Beta Prime');
  assert.deepEqual(updated.metadata, { world: 'prime', season: 'winter' });
  assert.equal(updated.lastSaved, 555);

  const refreshed = repository.getSession('beta');
  assert.equal(refreshed.name, 'Beta Prime');
  assert.deepEqual(refreshed.metadata, { world: 'prime', season: 'winter' });
  assert.equal(repository.getIndex().activeSessionId, 'beta');
});
