import { getActionState, getState } from '../../../../core/state.js';

function sanitizePendingCount(value, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  if (!Number.isFinite(max)) {
    return Math.floor(numeric);
  }
  return Math.max(0, Math.min(Math.floor(numeric), Math.floor(max)));
}

export function createDailyLimitTracker(metadata) {
  function resolveDailyUsage(state = getState(), { sync = false } = {}) {
    const actionState = getActionState(metadata.id, state);
    const currentDay = Number(state?.day) || 1;

    const lastRunDay = Number(actionState.lastRunDay) || 0;
    const baseRuns = Number(actionState.runsToday) || 0;
    const sanitizedRuns = Math.max(0, baseRuns);
    const usedToday = metadata.dailyLimit
      ? (lastRunDay === currentDay ? sanitizedRuns : 0)
      : sanitizedRuns;

    const pendingDay = Number(actionState.pendingAcceptsDay) || 0;
    const pendingBase = pendingDay === currentDay ? actionState.pendingAccepts : 0;
    const pendingToday = sanitizePendingCount(pendingBase, metadata.dailyLimit);

    if (sync) {
      if (metadata.dailyLimit) {
        if (lastRunDay !== currentDay) {
          actionState.lastRunDay = currentDay;
          actionState.runsToday = usedToday;
        }
        if (pendingDay !== currentDay) {
          actionState.pendingAcceptsDay = pendingToday > 0 ? currentDay : null;
          actionState.pendingAccepts = pendingToday;
        } else if (actionState.pendingAccepts !== pendingToday) {
          actionState.pendingAccepts = pendingToday;
        }
      } else if (!Number.isFinite(baseRuns) || baseRuns < 0) {
        actionState.runsToday = 0;
      }
      if (pendingToday === 0 && metadata.dailyLimit) {
        actionState.pendingAccepts = 0;
        actionState.pendingAcceptsDay = null;
      }
    }

    if (!metadata.dailyLimit) {
      return {
        actionState,
        currentDay,
        limit: null,
        used: Math.max(0, baseRuns),
        pending: pendingToday,
        remaining: null
      };
    }

    const remaining = Math.max(0, metadata.dailyLimit - usedToday - pendingToday);

    return {
      actionState,
      currentDay,
      limit: metadata.dailyLimit,
      used: usedToday,
      pending: pendingToday,
      remaining
    };
  }

  function reserveDailyUsage(state = getState()) {
    if (!metadata.dailyLimit) return null;
    const usage = resolveDailyUsage(state, { sync: true });
    if (usage.remaining <= 0) {
      return null;
    }
    const available = metadata.dailyLimit - usage.used;
    const nextPending = Math.min(available, usage.pending + 1);
    usage.actionState.pendingAccepts = nextPending;
    usage.actionState.pendingAcceptsDay = usage.currentDay;
    const remaining = Math.max(0, metadata.dailyLimit - usage.used - nextPending);
    return {
      limit: metadata.dailyLimit,
      used: usage.used,
      pending: nextPending,
      remaining,
      day: usage.currentDay
    };
  }

  function releaseDailyUsage(state = getState()) {
    if (!metadata.dailyLimit) return null;
    const usage = resolveDailyUsage(state, { sync: true });
    const nextPending = usage.pending > 0 ? usage.pending - 1 : 0;
    usage.actionState.pendingAccepts = nextPending;
    usage.actionState.pendingAcceptsDay = nextPending > 0 ? usage.currentDay : null;
    const remaining = Math.max(0, metadata.dailyLimit - usage.used - nextPending);
    return {
      limit: metadata.dailyLimit,
      used: usage.used,
      pending: nextPending,
      remaining,
      day: usage.currentDay
    };
  }

  function consumeDailyUsage(state = getState()) {
    if (!metadata.dailyLimit) return null;
    const usage = resolveDailyUsage(state, { sync: true });
    const nextPending = usage.pending > 0 ? usage.pending - 1 : 0;
    const nextUsed = Math.min(metadata.dailyLimit, usage.used + 1);
    usage.actionState.lastRunDay = usage.currentDay;
    usage.actionState.runsToday = nextUsed;
    usage.actionState.pendingAccepts = nextPending;
    usage.actionState.pendingAcceptsDay = nextPending > 0 ? usage.currentDay : null;
    const remaining = Math.max(0, metadata.dailyLimit - nextUsed - nextPending);
    return {
      limit: metadata.dailyLimit,
      used: nextUsed,
      pending: nextPending,
      remaining,
      day: usage.currentDay
    };
  }

  return { resolveDailyUsage, reserveDailyUsage, releaseDailyUsage, consumeDailyUsage };
}
