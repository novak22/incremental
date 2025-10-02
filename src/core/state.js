import { DEFAULT_DAY_HOURS } from './constants.js';
import { structuredClone } from './helpers.js';
import {
  createEmptyCharacterState,
  createEmptySkillState,
  normalizeCharacterState,
  normalizeSkillState
} from '../game/skills/data.js';
import { ensureNicheStateShape } from './state/niches.js';
import {
  ensureSlice as ensureHustleSlice,
  getSliceState as getHustleSliceState
} from './state/slices/hustles.js';
import {
  ensureSlice as ensureAssetSlice,
  getSliceState as getAssetSliceState
} from './state/slices/assets.js';
import {
  ensureSlice as ensureUpgradeSlice,
  getSliceState as getUpgradeSliceState
} from './state/slices/upgrades.js';
import { ensureSlice as ensureProgressSlice } from './state/slices/progress.js';

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

  ensureMetricsHistory(target = this.state) {
    if (!target) return null;
    target.metrics = target.metrics || {};
    if (!Array.isArray(target.metrics.history)) {
      target.metrics.history = [];
    }
    return target.metrics.history;
  }

  ensureStateShape(target = this.state) {
    if (!target) return;

    ensureHustleSlice(target);
    ensureAssetSlice(target);
    ensureUpgradeSlice(target);
    ensureProgressSlice(target);

    target.totals = target.totals || {};
    const earned = Number(target.totals.earned);
    const spent = Number(target.totals.spent);
    target.totals.earned = Number.isFinite(earned) && earned > 0 ? earned : 0;
    target.totals.spent = Number.isFinite(spent) && spent > 0 ? spent : 0;

    target.skills = normalizeSkillState(target.skills);
    target.character = normalizeCharacterState(target.character);

    this.ensureDailyMetrics(target);
    this.ensureMetricsHistory(target);
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
        daily: this.createEmptyDailyMetrics(),
        history: []
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
    return getHustleSliceState(target, id);
  }

  getAssetState(id, target = this.state) {
    return getAssetSliceState(target, id);
  }

  countActiveAssetInstances(assetId, target = this.state) {
    if (!assetId) return 0;
    const assetState = this.getAssetState(assetId, target);
    const instances = Array.isArray(assetState?.instances) ? assetState.instances : [];
    return instances.filter(instance => instance?.status === 'active').length;
  }

  getUpgradeState(id, target = this.state) {
    return getUpgradeSliceState(target, id);
  }
}

const stateManager = new StateManager();

export const createEmptyDailyMetrics = (...args) => stateManager.createEmptyDailyMetrics(...args);
export const ensureDailyMetrics = (...args) => stateManager.ensureDailyMetrics(...args);
export const ensureMetricsHistory = (...args) => stateManager.ensureMetricsHistory(...args);
export const ensureStateShape = (...args) => stateManager.ensureStateShape(...args);
export const buildDefaultState = (...args) => stateManager.buildDefaultState(...args);
export const initializeState = (...args) => stateManager.initializeState(...args);
export const replaceState = (...args) => stateManager.replaceState(...args);
export const getState = (...args) => stateManager.getState(...args);
export const getHustleState = (...args) => stateManager.getHustleState(...args);
export const getAssetState = (...args) => stateManager.getAssetState(...args);
export const getUpgradeState = (...args) => stateManager.getUpgradeState(...args);
export const countActiveAssetInstances = (...args) => stateManager.countActiveAssetInstances(...args);

export {
  configureRegistry,
  getRegistrySnapshot,
  getHustleDefinition,
  getAssetDefinition,
  getUpgradeDefinition,
  getMetricDefinition
} from './state/registry.js';
export { createAssetInstance, normalizeAssetInstance, normalizeAssetState } from './state/assets.js';
export { ensureNicheStateShape } from './state/niches.js';
