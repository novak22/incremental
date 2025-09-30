import { createId, structuredClone } from '../helpers.js';
import { isValidNicheId } from './niches.js';

function resolveCurrentDay(context = {}) {
  if (Number.isFinite(Number(context.day))) {
    return Math.max(1, Number(context.day));
  }
  if (context.state && Number.isFinite(Number(context.state.day))) {
    return Math.max(1, Number(context.state.day));
  }
  return 1;
}

export function normalizeAssetInstance(definition, instance = {}, context = {}) {
  const normalized = { ...instance };
  if (!normalized.id) {
    normalized.id = createId();
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

  const usageEntries = Object.entries(normalized.dailyUsage || {});
  const normalizedUsage = {};
  for (const [key, value] of usageEntries) {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      normalizedUsage[key] = Math.max(0, Math.floor(numericValue));
    }
  }

  normalized.dailyUsage = normalizedUsage;
  delete normalized.cooldowns;

  const lastIncome = Number(normalized.lastIncome);
  normalized.lastIncome = Number.isFinite(lastIncome) ? lastIncome : 0;
  const breakdown = normalized.lastIncomeBreakdown;
  if (breakdown && typeof breakdown === 'object') {
    const entries = Array.isArray(breakdown.entries)
      ? breakdown.entries
          .map(entry => {
            if (!entry) return null;
            const label = String(entry.label || '').trim();
            const amount = Number(entry.amount);
            if (!label || !Number.isFinite(amount)) return null;
            return {
              id: entry.id || null,
              label,
              amount: Math.round(amount),
              type: entry.type || 'modifier',
              percent: Number.isFinite(Number(entry.percent)) ? Number(entry.percent) : null
            };
          })
          .filter(Boolean)
      : [];
    const total = Number(breakdown.total);
    normalized.lastIncomeBreakdown = {
      total: Number.isFinite(total) ? Math.max(0, Math.round(total)) : normalized.lastIncome,
      entries
    };
  } else {
    normalized.lastIncomeBreakdown = null;
  }
  const pendingIncome = Number(normalized.pendingIncome);
  normalized.pendingIncome = Number.isFinite(pendingIncome) ? Math.max(0, pendingIncome) : 0;
  const totalIncome = Number(normalized.totalIncome);
  normalized.totalIncome = Number.isFinite(totalIncome) ? totalIncome : 0;

  const createdOnDay = Number(normalized.createdOnDay);
  normalized.createdOnDay = Number.isFinite(createdOnDay)
    ? Math.max(1, createdOnDay)
    : resolveCurrentDay(context);

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

  const nicheId = typeof normalized.nicheId === 'string' ? normalized.nicheId : null;
  normalized.nicheId = nicheId && isValidNicheId(nicheId) ? nicheId : null;

  return normalized;
}

export function createAssetInstance(definition, overrides = {}, context = {}) {
  const setupDays = Math.max(0, Number(definition?.setup?.days) || 0);
  const baseInstance = {
    status: setupDays > 0 ? 'setup' : 'active',
    daysRemaining: setupDays,
    daysCompleted: setupDays > 0 ? 0 : setupDays,
    setupFundedToday: false,
    maintenanceFundedToday: false,
    dailyUsage: {},
    lastIncome: 0,
    lastIncomeBreakdown: null,
    pendingIncome: 0,
    totalIncome: 0,
    createdOnDay: resolveCurrentDay(context),
    quality: {
      level: 0,
      progress: {}
    },
    nicheId: null
  };
  const merged = { ...baseInstance, ...structuredClone(overrides) };
  if (merged.status === 'active') {
    merged.daysRemaining = 0;
    if (!Number.isFinite(Number(merged.daysCompleted))) {
      merged.daysCompleted = setupDays;
    }
  }
  return normalizeAssetInstance(definition, merged, context);
}

export function normalizeAssetState(definition, assetState = {}, context = {}) {
  const defaults = structuredClone(definition.defaultState || {});
  const merged = { ...defaults, ...assetState };
  if (!Array.isArray(merged.instances)) {
    merged.instances = [];
  }

  merged.instances = merged.instances.map(instance => normalizeAssetInstance(definition, instance, context));

  if (merged.active && merged.instances.length === 0) {
    merged.instances.push(createAssetInstance(definition, { status: 'active' }, context));
  }

  delete merged.active;
  delete merged.buffer;
  delete merged.fundedToday;

  return merged;
}

export default {
  createAssetInstance,
  normalizeAssetInstance,
  normalizeAssetState
};
