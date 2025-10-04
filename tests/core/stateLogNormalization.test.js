import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDefaultState, initializeState, getState } from '../../src/core/state.js';

test('normalizeLogEntry marks auto-read log types as read', () => {
  const baseState = buildDefaultState();
  baseState.log = [
    { id: 'log-1', message: 'Daily hustle wrap.', type: 'hustle', read: false },
    { id: 'log-2', message: 'Polish complete.', type: 'quality' },
    { id: 'log-3', message: 'Cash dipped too low.', type: 'warning', read: false }
  ];

  initializeState(baseState);

  const state = getState();
  const hustleEntry = state.log.find(entry => entry.id === 'log-1');
  const qualityEntry = state.log.find(entry => entry.id === 'log-2');
  const warningEntry = state.log.find(entry => entry.id === 'log-3');

  assert.ok(hustleEntry, 'expected hustle log to persist');
  assert.equal(hustleEntry.read, true);
  assert.ok(qualityEntry, 'expected quality log to persist');
  assert.equal(qualityEntry.read, true);
  assert.ok(warningEntry, 'expected warning log to persist');
  assert.equal(warningEntry.read, false);

  initializeState();
});
