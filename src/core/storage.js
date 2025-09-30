import { STORAGE_KEY } from './constants.js';
import { structuredClone } from './helpers.js';
import {
  buildDefaultState,
  ensureStateShape,
  getState,
  initializeState,
  replaceState
} from './state.js';
import { StatePersistence } from './persistence/index.js';

const persistence = new StatePersistence({
  storageKey: STORAGE_KEY,
  storage: globalThis?.localStorage,
  clone: structuredClone,
  now: () => Date.now(),
  buildDefaultState,
  initializeState,
  replaceState,
  ensureStateShape,
  getState
});

export function loadState(options = {}) {
  return persistence.load(options);
}

export function saveState() {
  return persistence.save();
}

export function getStatePersistence() {
  return persistence;
}
