import { DEFAULT_DAY_HOURS } from './constants.js';
import { structuredClone, createId } from './helpers.js';
import {
  createEmptyCharacterState,
  createEmptySkillState,
  normalizeCharacterState,
  normalizeSkillState
} from '../game/skills/data.js';
import { ensureNicheStateShape } from './state/niches.js';
import { ensureEventState } from './state/events.js';
import {
  ensureSlice as ensureActionSlice,
  getSliceState as getActionSliceState
} from './state/slices/actions.js';
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
import {
  ensureHustleMarketState,
  createDefaultHustleMarketState
} from './state/slices/hustleMarket/index.js';
import { isAutoReadType } from './logAutoReadTypes.js';

function normalizeLogEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return {
      id: createId(),
      timestamp: Date.now(),
      message: '',
      type: 'info',
      read: true
    };
  }

  const normalized = { ...entry };
  const timestamp = Number(entry.timestamp);
  normalized.timestamp = Number.isFinite(timestamp) ? timestamp : Date.now();
  normalized.id = typeof entry.id === 'string' && entry.id ? entry.id : createId();
  normalized.message = entry.message != null ? String(entry.message) : '';
  normalized.type = typeof entry.type === 'string' && entry.type ? entry.type : 'info';
  normalized.read = entry.read === true || isAutoReadType(normalized.type);
  return normalized;
}

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

    ensureActionSlice(target);
    ensureHustleSlice(target);
    ensureAssetSlice(target);
    ensureUpgradeSlice(target);
    ensureProgressSlice(target);
    ensureHustleMarketState(target, { fallbackDay: target.day || 1 });

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
    ensureEventState(target, { fallbackDay: target.day || 1 });

    if (!Array.isArray(target.log)) {
      target.log = [];
    } else {
      target.log = target.log.map(entry => normalizeLogEntry(entry));
    }
  }

  buildBaseState() {
    return {
      money: 45,
      timeLeft: DEFAULT_DAY_HOURS,
      baseTime: DEFAULT_DAY_HOURS,
      bonusTime: 0,
      dailyBonusTime: 0,
      day: 1,
      actions: {},
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
        watchlist: [],
        analyticsHistory: []
      },
      events: {
        active: []
      },
      metrics: {
        daily: this.createEmptyDailyMetrics(),
        history: []
      },
      log: [],
      lastSaved: Date.now(),
      hustleMarket: createDefaultHustleMarketState()
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

  getActionState(id, target = this.state) {
    return getActionSliceState(target, id);
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

export function createStateManager() {
  return new StateManager();
}

export const defaultStateManager = createStateManager();

export const createEmptyDailyMetrics = (...args) =>
  defaultStateManager.createEmptyDailyMetrics(...args);
export const ensureDailyMetrics = (...args) =>
  defaultStateManager.ensureDailyMetrics(...args);
export const ensureMetricsHistory = (...args) =>
  defaultStateManager.ensureMetricsHistory(...args);
export const ensureStateShape = (...args) =>
  defaultStateManager.ensureStateShape(...args);
export const buildDefaultState = (...args) =>
  defaultStateManager.buildDefaultState(...args);
export const initializeState = (...args) =>
  defaultStateManager.initializeState(...args);
export const replaceState = (...args) =>
  defaultStateManager.replaceState(...args);
export const getState = (...args) => defaultStateManager.getState(...args);
export const getActionState = (...args) =>
  defaultStateManager.getActionState(...args);
export const getHustleState = (...args) =>
  defaultStateManager.getHustleState(...args);
export const getAssetState = (...args) =>
  defaultStateManager.getAssetState(...args);
export const getUpgradeState = (...args) =>
  defaultStateManager.getUpgradeState(...args);
export const countActiveAssetInstances = (...args) =>
  defaultStateManager.countActiveAssetInstances(...args);

