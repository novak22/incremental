import { attachRegistryMetricIds, buildMetricIndex } from './schema/metrics.js';
import { isHustleDefinition } from './registryShared.js';

let registrySnapshot = null;
let actionMap = new Map();
let assetMap = new Map();
let upgradeMap = new Map();
let metricIndex = new Map();

function deriveHustleView(actions = [], fallback = []) {
  if (!Array.isArray(actions) || !actions.length) {
    return Array.isArray(fallback) ? fallback : [];
  }
  const hustles = actions.filter(isHustleDefinition);
  if (hustles.length) {
    return hustles;
  }
  return Array.isArray(fallback) ? fallback : [];
}

function buildMaps({ actions = [], hustles = [], assets = [], upgrades = [] }) {
  const actionDefinitions = Array.isArray(actions) ? actions : [];
  actionMap = new Map(actionDefinitions.map(definition => [definition.id, definition]));
  assetMap = new Map(assets.map(definition => [definition.id, definition]));
  upgradeMap = new Map(upgrades.map(definition => [definition.id, definition]));
  metricIndex = buildMetricIndex({ actions: actionDefinitions, hustles, assets, upgrades });
}

export function loadRegistry(definitions = {}) {
  const incomingActions = Array.isArray(definitions.actions) ? definitions.actions : [];
  const incomingHustles = Array.isArray(definitions.hustles) ? definitions.hustles : [];
  const incomingAssets = Array.isArray(definitions.assets) ? definitions.assets : [];
  const incomingUpgrades = Array.isArray(definitions.upgrades) ? definitions.upgrades : [];

  const canonicalActions = incomingActions.length ? incomingActions : incomingHustles;

  const prepared = attachRegistryMetricIds({
    actions: canonicalActions,
    hustles: incomingHustles,
    assets: incomingAssets,
    upgrades: incomingUpgrades
  });

  const actions = Array.isArray(prepared.actions) ? prepared.actions : [];
  const hustles = deriveHustleView(actions, prepared.hustles);

  registrySnapshot = {
    actions,
    assets: prepared.assets,
    upgrades: prepared.upgrades,
    hustles
  };
  buildMaps({
    actions,
    hustles,
    assets: prepared.assets,
    upgrades: prepared.upgrades
  });
  return registrySnapshot;
}

function ensureLoaded() {
  if (!registrySnapshot) {
    throw new Error('Registry definitions have not been loaded. Call loadRegistry() first.');
  }
}

export function resetRegistry() {
  registrySnapshot = null;
  actionMap = new Map();
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

export function getActions() {
  return getRegistry().actions;
}

export function getAssets() {
  return getRegistry().assets;
}

export function getUpgrades() {
  return getRegistry().upgrades;
}

export function getHustleDefinition(id) {
  return getActionDefinition(id);
}

export function getActionDefinition(id) {
  ensureLoaded();
  return actionMap.get(id) || null;
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
