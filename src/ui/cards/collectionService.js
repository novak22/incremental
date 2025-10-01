import { configureRegistry } from '../../core/state/registry.js';
import { getRegistry } from '../../game/registryService.js';
import { loadDefaultRegistry } from '../../game/registryLoader.js';
import {
  buildAssetModels,
  buildEducationModels,
  buildHustleModels,
  buildUpgradeModels
} from './model.js';

let cachedRegistries = null;
let cachedModels = null;
let lastRegistrySnapshot = null;

function updateSnapshot(snapshot) {
  if (snapshot !== lastRegistrySnapshot) {
    lastRegistrySnapshot = snapshot;
    cachedRegistries = null;
    cachedModels = null;
  }

  return snapshot;
}

function ensureRegistrySnapshot() {
  try {
    const snapshot = getRegistry();
    return updateSnapshot(snapshot);
  } catch (error) {
    const message = typeof error?.message === 'string' ? error.message : '';
    const registryMissing = message.includes('Registry definitions have not been loaded');

    if (!registryMissing) {
      throw error;
    }

    loadDefaultRegistry();
    configureRegistry();
    const snapshot = getRegistry();
    return updateSnapshot(snapshot);
  }
}

function buildRegistries() {
  const registry = ensureRegistrySnapshot();
  const hustles = registry.hustles.filter(hustle => hustle.tag?.type !== 'study');
  const education = registry.hustles.filter(hustle => hustle.tag?.type === 'study');
  const assets = registry.assets;
  const upgrades = registry.upgrades;

  return {
    hustles,
    education,
    assets,
    upgrades
  };
}

function buildModels(registries) {
  return {
    hustles: buildHustleModels(registries.hustles),
    education: buildEducationModels(registries.education),
    assets: buildAssetModels(registries.assets),
    upgrades: buildUpgradeModels(registries.upgrades)
  };
}

function getCollections() {
  if (!cachedRegistries) {
    cachedRegistries = buildRegistries();
  }

  if (!cachedModels) {
    cachedModels = buildModels(cachedRegistries);
  }

  return {
    registries: cachedRegistries,
    models: cachedModels
  };
}

function refreshCollections({ registries: refreshRegistries = false } = {}) {
  cachedModels = null;
  if (refreshRegistries) {
    cachedRegistries = null;
  }
}

export default {
  getCollections,
  refreshCollections
};
