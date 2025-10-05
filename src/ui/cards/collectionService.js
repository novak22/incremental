import { ensureRegistryReady } from '../../game/registryBootstrap.js';
import './model/index.js';
import { buildModelMap } from './modelBuilderRegistry.js';

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
  const actionDefinitions = Array.isArray(registry.actions) && registry.actions.length
    ? registry.actions
    : Array.isArray(registry.hustles)
      ? registry.hustles
      : [];

  const hustleTemplates = Array.isArray(registry.hustles) && registry.hustles.length
    ? registry.hustles
    : actionDefinitions;

  const hustles = hustleTemplates.filter(hustle => hustle.tag?.type !== 'study');
  const education = actionDefinitions.filter(definition => definition.tag?.type === 'study');
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
  return buildModelMap(registries);
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
