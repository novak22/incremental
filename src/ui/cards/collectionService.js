import { ensureRegistryReady } from '../../game/registryBootstrap.js';
import {
  buildAssetModels,
  buildDigishelfModel,
  buildBlogpressModel,
  buildShopilyModel,
  buildEducationModels,
  buildHustleModels,
  buildUpgradeModels,
  buildVideoTubeModel
} from './model/index.js';

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
  const snapshot = ensureRegistryReady();
  return updateSnapshot(snapshot);
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
    digishelf: buildDigishelfModel(registries.assets),
    shopily: buildShopilyModel(registries.assets, registries.upgrades),
    upgrades: buildUpgradeModels(registries.upgrades),
    blogpress: buildBlogpressModel(registries.assets, registries.upgrades),
    videotube: buildVideoTubeModel(registries.assets)
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
