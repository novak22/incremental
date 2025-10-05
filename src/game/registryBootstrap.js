import { loadDefaultRegistry } from './registryLoader.js';
import { getRegistry } from './registryService.js';
import { configureRegistry, getRegistrySnapshot } from '../core/state/registry.js';
import { ensureDailyOffersForDay } from './hustles.js';
import { getState } from '../core/state.js';

let isRegistryReady = false;
let readySnapshot = null;

function registryLoaded() {
  try {
    getRegistry();
    return true;
  } catch (error) {
    return false;
  }
}

export function ensureRegistryReady() {
  if (isRegistryReady) {
    if (registryLoaded()) {
      return readySnapshot;
    }

    isRegistryReady = false;
    readySnapshot = null;
  }

  if (!registryLoaded()) {
    loadDefaultRegistry();
  }

  configureRegistry();
  readySnapshot = getRegistrySnapshot();
  isRegistryReady = true;

  const state = getState();
  const templates = Array.isArray(readySnapshot?.hustles) ? readySnapshot.hustles : undefined;
  if (state) {
    ensureDailyOffersForDay({ state, templates, day: state.day });
  }

  return readySnapshot;
}

