import { configureRegistry } from '../../core/state/registry.js';
import { getRegistry } from '../../game/registryService.js';
import { loadDefaultRegistry } from '../../game/registryLoader.js';
import {
  buildAssetModels,
  buildEducationModels,
  buildHustleModels,
  buildUpgradeModels
} from './model.js';

let hasEnsuredRegistry = false;
let cachedRegistries = null;
let cachedModels = null;

function ensureRegistrySnapshot() {
  try {
    const snapshot = getRegistry();
    hasEnsuredRegistry = true;
    return snapshot;
  } catch (error) {
    const message = typeof error?.message === 'string' ? error.message : '';
    const registryMissing = message.includes('Registry definitions have not been loaded');

    if (!registryMissing) {
      throw error;
    }

    hasEnsuredRegistry = false;
    loadDefaultRegistry();
    configureRegistry();
    hasEnsuredRegistry = true;
    return getRegistry();
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
