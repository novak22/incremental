const DEFAULT_DAILY_LIMIT = 1;

export function ensureUsageMap(instance) {
  if (!instance.dailyUsage || typeof instance.dailyUsage !== 'object') {
    instance.dailyUsage = {};
  }
  return instance.dailyUsage;
}

export function getDailyLimit(action) {
  const limit = Number(action?.dailyLimit);
  if (!Number.isFinite(limit) || limit <= 0) {
    return DEFAULT_DAILY_LIMIT;
  }
  return Math.max(DEFAULT_DAILY_LIMIT, Math.floor(limit));
}

export function getUsageCount(instance, actionId) {
  if (!instance?.dailyUsage) return 0;
  const value = Number(instance.dailyUsage[actionId]);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function getUsageStatus(instance, action) {
  const dailyLimit = getDailyLimit(action);
  const usedToday = Math.min(dailyLimit, getUsageCount(instance, action.id));
  const remainingUses = Math.max(0, dailyLimit - usedToday);
  return {
    dailyLimit,
    usedToday,
    remainingUses,
    exhausted: remainingUses <= 0
  };
}

export function trackUsage(instance, action) {
  const map = ensureUsageMap(instance);
  const dailyLimit = getDailyLimit(action);
  const current = getUsageCount(instance, action.id);
  map[action.id] = Math.min(dailyLimit, current + 1);
}

export default {
  ensureUsageMap,
  getDailyLimit,
  getUsageCount,
  getUsageStatus,
  trackUsage
};
