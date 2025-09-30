import { attachRegistryMetricIds, buildMetricIndex } from '../../game/schema/metrics.js';

let registry = { hustles: [], assets: [], upgrades: [] };
let hustleMap = new Map();
let assetMap = new Map();
let upgradeMap = new Map();
let metricIndex = new Map();

export function configureRegistry({ hustles = [], assets = [], upgrades = [] }) {
  const prepared = attachRegistryMetricIds({ hustles, assets, upgrades });
  registry = prepared;
  hustleMap = new Map(prepared.hustles.map(item => [item.id, item]));
  assetMap = new Map(prepared.assets.map(item => [item.id, item]));
  upgradeMap = new Map(prepared.upgrades.map(item => [item.id, item]));
  metricIndex = buildMetricIndex(prepared);
}

export function getRegistrySnapshot() {
  return registry;
}

export function getHustleDefinition(id) {
  return hustleMap.get(id);
}

export function getAssetDefinition(id) {
  return assetMap.get(id);
}

export function getUpgradeDefinition(id) {
  return upgradeMap.get(id);
}

export function getMetricDefinition(metricId) {
  return metricIndex.get(metricId);
}

export default {
  configureRegistry,
  getRegistrySnapshot,
  getHustleDefinition,
  getAssetDefinition,
  getUpgradeDefinition,
  getMetricDefinition
};
