import { DEFAULT_DAY_HOURS } from './constants.js';
import { structuredClone } from './helpers.js';
import {
  createEmptyCharacterState,
  createEmptySkillState,
  normalizeCharacterState,
  normalizeSkillState
} from '../game/skills/data.js';
import { ensureNicheStateShape } from './state/niches.js';
import { normalizeAssetState } from './state/assets.js';
import {
  configureRegistry,
  getRegistrySnapshot,
  getHustleDefinition,
  getAssetDefinition,
  getUpgradeDefinition,
  getMetricDefinition
} from './state/registry.js';

class StateManager {
  constructor() {
    this.state = null;
  }

  createEmptyDailyMetrics() {
    return {
      time: {},
      payouts: {},
      costs: {}
    };
  }

  ensureDailyMetrics(target = this.state) {
    if (!target) return null;
    target.metrics = target.metrics || {};
    if (!target.metrics.daily) {
      target.metrics.daily = this.createEmptyDailyMetrics();
    }
    return target.metrics.daily;
  }

  ensureStateShape(target = this.state) {
    if (!target) return;

    const registry = getRegistrySnapshot();

    target.hustles = target.hustles || {};
    for (const def of registry.hustles) {
      const defaults = structuredClone(def.defaultState || {});
      const existing = target.hustles[def.id];
      target.hustles[def.id] = existing ? { ...defaults, ...existing } : defaults;
    }

    target.assets = target.assets || {};
    for (const def of registry.assets) {
      const existing = target.assets[def.id];
      const normalized = normalizeAssetState(def, existing || {}, { state: target });
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

    target.skills = normalizeSkillState(target.skills);
    target.character = normalizeCharacterState(target.character);

    this.ensureDailyMetrics(target);
    ensureNicheStateShape(target, { fallbackDay: target.day || 1 });
  }

  buildBaseState() {
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
      skills: createEmptySkillState(),
      character: createEmptyCharacterState(),
      totals: {
        earned: 0,
        spent: 0
      },
      progress: {
        knowledge: {}
      },
      niches: {
        popularity: {},
        lastRollDay: 0
      },
      metrics: {
        daily: this.createEmptyDailyMetrics()
      },
      log: [],
      lastSaved: Date.now()
    };
  }

  buildDefaultState() {
    const base = this.buildBaseState();
    this.ensureStateShape(base);
    return base;
  }

  initializeState(initialState = null) {
    this.state = initialState ? structuredClone(initialState) : this.buildDefaultState();
    this.ensureStateShape(this.state);
    return this.state;
  }

  replaceState(nextState) {
    this.state = structuredClone(nextState);
    this.ensureStateShape(this.state);
    return this.state;
  }

  getState() {
    return this.state;
  }

  getHustleState(id, target = this.state) {
    target.hustles = target.hustles || {};
    if (!target.hustles[id]) {
      const def = getHustleDefinition(id);
      target.hustles[id] = structuredClone(def?.defaultState || {});
    }
    return target.hustles[id];
  }

  getAssetState(id, target = this.state) {
    target.assets = target.assets || {};
    const def = getAssetDefinition(id);
    if (!def) {
      if (!target.assets[id]) {
        target.assets[id] = {};
      }
      return target.assets[id];
    }
    target.assets[id] = normalizeAssetState(def, target.assets[id] || {}, { state: target });
    return target.assets[id];
  }

  countActiveAssetInstances(assetId, target = this.state) {
    if (!assetId) return 0;
    const assetState = this.getAssetState(assetId, target);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    return instances.filter(instance => instance?.status === 'active').length;
  }

  getUpgradeState(id, target = this.state) {
    target.upgrades = target.upgrades || {};
    if (!target.upgrades[id]) {
      const def = getUpgradeDefinition(id);
      target.upgrades[id] = structuredClone(def?.defaultState || {});
    }
    return target.upgrades[id];
  }
}

const stateManager = new StateManager();

export default stateManager;

export const createEmptyDailyMetrics = (...args) => stateManager.createEmptyDailyMetrics(...args);
export const ensureDailyMetrics = (...args) => stateManager.ensureDailyMetrics(...args);
export const ensureStateShape = (...args) => stateManager.ensureStateShape(...args);
export const buildDefaultState = (...args) => stateManager.buildDefaultState(...args);
export const initializeState = (...args) => stateManager.initializeState(...args);
export const replaceState = (...args) => stateManager.replaceState(...args);
export const getState = (...args) => stateManager.getState(...args);
export const getHustleState = (...args) => stateManager.getHustleState(...args);
export const getAssetState = (...args) => stateManager.getAssetState(...args);
export const countActiveAssetInstances = (...args) => stateManager.countActiveAssetInstances(...args);
export const getUpgradeState = (...args) => stateManager.getUpgradeState(...args);

export {
  configureRegistry,
  getRegistrySnapshot,
  getHustleDefinition,
  getAssetDefinition,
  getUpgradeDefinition,
  getMetricDefinition
};
export { createAssetInstance, normalizeAssetInstance, normalizeAssetState } from './state/assets.js';
export { ensureNicheStateShape } from './state/niches.js';
