import { structuredClone } from './helpers.js';

let registry = { hustles: [], assets: [], upgrades: [] };
let hustleMap = new Map();
let assetMap = new Map();
let upgradeMap = new Map();

export let state = null;

export function configureRegistry({ hustles = [], assets = [], upgrades = [] }) {
  registry = { hustles, assets, upgrades };
  hustleMap = new Map(hustles.map(item => [item.id, item]));
  assetMap = new Map(assets.map(item => [item.id, item]));
  upgradeMap = new Map(upgrades.map(item => [item.id, item]));
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

export function normalizeAssetInstance(instance = {}) {
  const normalized = { ...instance };
  if (!normalized.id) {
    normalized.id = cryptoId();
  }
  const numericBuffer = Number(normalized.buffer);
  normalized.buffer = Number.isFinite(numericBuffer) ? numericBuffer : 0;
  if (typeof normalized.startedAt !== 'number' || Number.isNaN(normalized.startedAt)) {
    normalized.startedAt = Date.now();
  }
  return normalized;
}

export function createAssetInstance(overrides = {}) {
  return normalizeAssetInstance({ ...overrides });
}

export function normalizeAssetState(definition, assetState = {}) {
  const defaults = structuredClone(definition.defaultState || {});
  const merged = { ...defaults, ...assetState };

  const multiplierDefault = typeof defaults.multiplier === 'number' ? defaults.multiplier : 1;
  const parsedMultiplier = Number(merged.multiplier);
  merged.multiplier = Number.isFinite(parsedMultiplier) ? parsedMultiplier : multiplierDefault;

  if (!Array.isArray(merged.instances)) {
    merged.instances = [];
  }

  const parsedBuffer = Number(merged.buffer);
  const legacyBuffer = Number.isFinite(parsedBuffer) ? parsedBuffer : 0;
  const hadLegacyActive = Boolean(merged.active);

  if ((hadLegacyActive || legacyBuffer) && merged.instances.length === 0) {
    merged.instances.push(createAssetInstance({ buffer: legacyBuffer }));
  }

  merged.instances = merged.instances.map(normalizeAssetInstance);

  delete merged.active;
  delete merged.buffer;

  return merged;
}

export function ensureStateShape(target = state) {
  if (!target) return;

  target.hustles = target.hustles || {};
  for (const def of registry.hustles) {
    const defaults = structuredClone(def.defaultState || {});
    const existing = target.hustles[def.id];
    target.hustles[def.id] = existing ? { ...defaults, ...existing } : defaults;
  }

  target.assets = target.assets || {};
  for (const def of registry.assets) {
    const existing = target.assets[def.id];
    const normalized = normalizeAssetState(def, existing || {});
    if (normalized.fundedToday === undefined) {
      normalized.fundedToday = Array.isArray(normalized.instances)
        ? normalized.instances.length > 0
        : !!normalized.active;
    }
    target.assets[def.id] = normalized;
  }

  target.upgrades = target.upgrades || {};
  for (const def of registry.upgrades) {
    const defaults = structuredClone(def.defaultState || {});
    const existing = target.upgrades[def.id];
    target.upgrades[def.id] = existing ? { ...defaults, ...existing } : defaults;
  }
}

export function buildBaseState() {
  return {
    money: 45,
    timeLeft: 14,
    baseTime: 14,
    bonusTime: 0,
    dailyBonusTime: 0,
    day: 1,
    hustles: {},
    assets: {},
    upgrades: {},
    log: [],
    lastSaved: Date.now()
  };
}

export function buildDefaultState() {
  const base = buildBaseState();
  ensureStateShape(base);
  return base;
}

export function initializeState(initialState = null) {
  state = initialState ? structuredClone(initialState) : buildDefaultState();
  ensureStateShape(state);
  return state;
}

export function replaceState(nextState) {
  state = structuredClone(nextState);
  ensureStateShape(state);
  return state;
}

export function getState() {
  return state;
}

export function getHustleState(id, target = state) {
  target.hustles = target.hustles || {};
  if (!target.hustles[id]) {
    const def = getHustleDefinition(id);
    target.hustles[id] = structuredClone(def?.defaultState || {});
  }
  return target.hustles[id];
}

export function getAssetState(id, target = state) {
  target.assets = target.assets || {};
  const def = getAssetDefinition(id);
  if (!def) {
    if (!target.assets[id]) {
      target.assets[id] = {};
    }
    return target.assets[id];
  }
  target.assets[id] = normalizeAssetState(def, target.assets[id] || {});
  return target.assets[id];
}

export function getUpgradeState(id, target = state) {
  target.upgrades = target.upgrades || {};
  if (!target.upgrades[id]) {
    const def = getUpgradeDefinition(id);
    target.upgrades[id] = structuredClone(def?.defaultState || {});
  }
  return target.upgrades[id];
}

function cryptoId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
