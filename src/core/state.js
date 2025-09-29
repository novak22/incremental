import { DEFAULT_DAY_HOURS } from './constants.js';
import { structuredClone } from './helpers.js';
import { attachRegistryMetricIds, buildMetricIndex } from '../game/schema/metrics.js';

let registry = { hustles: [], assets: [], upgrades: [] };
let hustleMap = new Map();
let assetMap = new Map();
let upgradeMap = new Map();
let metricIndex = new Map();

export let state = null;

export function createEmptyDailyMetrics() {
  return {
    time: {},
    payouts: {},
    costs: {}
  };
}

export function ensureDailyMetrics(target = state) {
  if (!target) return null;
  target.metrics = target.metrics || {};
  if (!target.metrics.daily) {
    target.metrics.daily = createEmptyDailyMetrics();
  }
  return target.metrics.daily;
}

export function configureRegistry({ hustles = [], assets = [], upgrades = [] }) {
  const prepared = attachRegistryMetricIds({ hustles, assets, upgrades });
  registry = prepared;
  hustleMap = new Map(prepared.hustles.map(item => [item.id, item]));
  assetMap = new Map(prepared.assets.map(item => [item.id, item]));
  upgradeMap = new Map(prepared.upgrades.map(item => [item.id, item]));
  metricIndex = buildMetricIndex(prepared);
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

export function normalizeAssetInstance(definition, instance = {}) {
  const normalized = { ...instance };
  if (!normalized.id) {
    normalized.id = cryptoId();
  }

  const setupDays = Math.max(0, Number(definition?.setup?.days) || 0);
  const status = normalized.status === 'active' || setupDays === 0 ? 'active' : 'setup';
  normalized.status = status;

  const remaining = Number(normalized.daysRemaining);
  if (status === 'setup') {
    normalized.daysRemaining = Number.isFinite(remaining) ? Math.max(0, remaining) : setupDays;
  } else {
    normalized.daysRemaining = 0;
  }

  const completed = Number(normalized.daysCompleted);
  if (Number.isFinite(completed)) {
    normalized.daysCompleted = Math.max(0, completed);
  } else {
    normalized.daysCompleted = status === 'active' ? setupDays : 0;
  }

  normalized.setupFundedToday = Boolean(normalized.setupFundedToday);
  normalized.maintenanceFundedToday = Boolean(normalized.maintenanceFundedToday);

  const cooldownEntries = Object.entries(normalized.cooldowns || {});
  const normalizedCooldowns = {};
  for (const [key, value] of cooldownEntries) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      normalizedCooldowns[key] = Math.max(0, Math.floor(numericValue));
    }
  }

  normalized.cooldowns = normalizedCooldowns;

  const lastIncome = Number(normalized.lastIncome);
  normalized.lastIncome = Number.isFinite(lastIncome) ? lastIncome : 0;
  const pendingIncome = Number(normalized.pendingIncome);
  normalized.pendingIncome = Number.isFinite(pendingIncome) ? Math.max(0, pendingIncome) : 0;
  const totalIncome = Number(normalized.totalIncome);
  normalized.totalIncome = Number.isFinite(totalIncome) ? totalIncome : 0;

  const createdOnDay = Number(normalized.createdOnDay);
  normalized.createdOnDay = Number.isFinite(createdOnDay) ? Math.max(1, createdOnDay) : (state?.day ?? 1);

  const quality = normalized.quality || {};
  const level = Number(quality.level);
  const normalizedLevel = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
  const progressEntries = Object.entries(quality.progress || {});
  const normalizedProgress = {};
  for (const [key, value] of progressEntries) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      normalizedProgress[key] = numericValue;
    }
  }
  normalized.quality = {
    level: normalizedLevel,
    progress: normalizedProgress
  };

  return normalized;
}

export function createAssetInstance(definition, overrides = {}) {
  const setupDays = Math.max(0, Number(definition?.setup?.days) || 0);
  const baseInstance = {
    status: setupDays > 0 ? 'setup' : 'active',
    daysRemaining: setupDays,
    daysCompleted: setupDays > 0 ? 0 : setupDays,
    setupFundedToday: false,
    maintenanceFundedToday: false,
    cooldowns: {},
    lastIncome: 0,
    pendingIncome: 0,
    totalIncome: 0,
    createdOnDay: state?.day ?? 1,
    quality: {
      level: 0,
      progress: {}
    }
  };
  const merged = { ...baseInstance, ...structuredClone(overrides) };
  if (merged.status === 'active') {
    merged.daysRemaining = 0;
    if (!Number.isFinite(Number(merged.daysCompleted))) {
      merged.daysCompleted = setupDays;
    }
  }
  return normalizeAssetInstance(definition, merged);
}

export function normalizeAssetState(definition, assetState = {}) {
  const defaults = structuredClone(definition.defaultState || {});
  const merged = { ...defaults, ...assetState };
  if (!Array.isArray(merged.instances)) {
    merged.instances = [];
  }

  merged.instances = merged.instances.map(instance => normalizeAssetInstance(definition, instance));

  if (merged.active && merged.instances.length === 0) {
    merged.instances.push(createAssetInstance(definition, { status: 'active' }));
  }

  delete merged.active;
  delete merged.buffer;
  delete merged.fundedToday;

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
    target.assets[def.id] = normalized;
  }

  target.upgrades = target.upgrades || {};
  for (const def of registry.upgrades) {
    const defaults = structuredClone(def.defaultState || {});
    const existing = target.upgrades[def.id];
    target.upgrades[def.id] = existing ? { ...defaults, ...existing } : defaults;
    if (def.id === 'assistant') {
      const assistantState = target.upgrades[def.id];
      const storedCount = Number(assistantState.count);
      if (!Number.isFinite(storedCount)) {
        assistantState.count = assistantState.purchased ? 1 : 0;
      } else {
        assistantState.count = Math.max(0, storedCount);
      }
      if (assistantState.purchased && assistantState.count === 0) {
        assistantState.count = 1;
      }
      delete assistantState.purchased;
    }
  }

  target.totals = target.totals || {};
  const earned = Number(target.totals.earned);
  const spent = Number(target.totals.spent);
  target.totals.earned = Number.isFinite(earned) && earned > 0 ? earned : 0;
  target.totals.spent = Number.isFinite(spent) && spent > 0 ? spent : 0;

  target.progress = target.progress || {};
  target.progress.knowledge = target.progress.knowledge || {};

  ensureDailyMetrics(target);
}

export function buildBaseState() {
  return {
    money: 45,
    timeLeft: DEFAULT_DAY_HOURS,
    baseTime: DEFAULT_DAY_HOURS,
    bonusTime: 0,
    dailyBonusTime: 0,
    day: 1,
    hustles: {},
    assets: {},
    upgrades: {},
    totals: {
      earned: 0,
      spent: 0
    },
    progress: {
      knowledge: {}
    },
    metrics: {
      daily: createEmptyDailyMetrics()
    },
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
