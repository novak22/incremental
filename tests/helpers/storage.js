import { ensureTestDom } from './setupDom.js';
import { createStorage as createStorageFactory } from '../../src/core/storage.js';
import { setSharedStorage } from '../../src/game/storageProvider.js';

function buildStorage(options = {}) {
  ensureTestDom();
  const storage = createStorageFactory(options);
  setSharedStorage(storage);
  return storage;
}

let storageInstance = null;

function getOrCreateStorage() {
  if (!storageInstance) {
    storageInstance = buildStorage();
  }
  return storageInstance;
}

export function getTestStorage() {
  return getOrCreateStorage();
}

export function resetTestStorage(options) {
  storageInstance = buildStorage(options);
  return storageInstance;
}

export function loadState(options) {
  return getOrCreateStorage().loadState(options);
}

export function saveState(options) {
  return getOrCreateStorage().saveState(options);
}

export const createStorage = options => buildStorage(options);
