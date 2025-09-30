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

function ensureStorageReference() {
  if (!persistence.storage && globalThis?.localStorage) {
    persistence.storage = globalThis.localStorage;
  }
}

export function loadState(options = {}) {
  ensureStorageReference();
  return persistence.load(options);
}

export function saveState() {
  ensureStorageReference();
  return persistence.save();
}

export function getStatePersistence() {
  ensureStorageReference();
  return persistence;
}
