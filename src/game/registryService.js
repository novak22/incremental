import { attachRegistryMetricIds, buildMetricIndex } from './schema/metrics.js';

let registrySnapshot = null;
let hustleMap = new Map();
let assetMap = new Map();
let upgradeMap = new Map();
let metricIndex = new Map();

function buildMaps({ hustles = [], assets = [], upgrades = [] }) {
  hustleMap = new Map(hustles.map(definition => [definition.id, definition]));
  assetMap = new Map(assets.map(definition => [definition.id, definition]));
  upgradeMap = new Map(upgrades.map(definition => [definition.id, definition]));
  metricIndex = buildMetricIndex({ hustles, assets, upgrades });
}

export function loadRegistry(definitions = {}) {
  const prepared = attachRegistryMetricIds({
    hustles: Array.isArray(definitions.hustles) ? definitions.hustles : [],
    assets: Array.isArray(definitions.assets) ? definitions.assets : [],
    upgrades: Array.isArray(definitions.upgrades) ? definitions.upgrades : []
  });

  registrySnapshot = prepared;
  buildMaps(prepared);
  return registrySnapshot;
}

function ensureLoaded() {
  if (!registrySnapshot) {
    throw new Error('Registry definitions have not been loaded. Call loadRegistry() first.');
  }
}

export function resetRegistry() {
  registrySnapshot = null;
  hustleMap = new Map();
  assetMap = new Map();
  upgradeMap = new Map();
  metricIndex = new Map();
}

export function getRegistry() {
  ensureLoaded();
  return registrySnapshot;
}

export function getHustles() {
  return getRegistry().hustles;
}

export function getAssets() {
  return getRegistry().assets;
}

export function getUpgrades() {
  return getRegistry().upgrades;
}

export function getHustleDefinition(id) {
  ensureLoaded();
  return hustleMap.get(id) || null;
}

export function getAssetDefinition(id) {
  ensureLoaded();
  return assetMap.get(id) || null;
}

export function getUpgradeDefinition(id) {
  ensureLoaded();
  return upgradeMap.get(id) || null;
}

export function getMetricDefinition(metricId) {
  ensureLoaded();
  return metricIndex.get(metricId) || null;
}

