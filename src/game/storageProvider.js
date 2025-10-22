import { createStorage } from '../core/storage.js';

let sharedStorage = null;

function ensureStorage() {
  if (!sharedStorage) {
    sharedStorage = createStorage();
  }
  return sharedStorage;
}

export function setSharedStorage(storage) {
  sharedStorage = storage ?? null;
  return sharedStorage;
}

export function getSaveState() {
  const storage = ensureStorage();
  return storage.saveState?.bind?.(storage) ?? null;
}

