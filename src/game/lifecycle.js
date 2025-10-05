import { addLog } from '../core/log.js';
import { getState, getUpgradeState } from '../core/state.js';
import { saveState } from '../core/storage.js';
import { allocateAssetMaintenance, closeOutDay } from './assets/index.js';
import { processAssistantPayroll } from './assistant.js';
import { getTimeCap } from './time.js';
import { flushDirty, markAllDirty, markDirty } from '../core/events/invalidationBus.js';
import { advanceKnowledgeTracks } from './requirements.js';
import { archiveDailyMetrics, resetDailyMetrics } from './metrics.js';
import { computeDailySummary } from './summary.js';
import { advanceEventsAfterDay } from './events/index.js';
import { archiveNicheAnalytics } from './analytics/niches.js';
import { syncNicheTrendSnapshots } from './events/syncNicheTrendSnapshots.js';

function flushUiWithFallback(fallbackToFull = false) {
  const flushed = flushDirty();
  if (flushed) {
    return;
  }
  if (!fallbackToFull) {
    return;
  }
  markAllDirty();
  flushDirty();
}

export function endDay(auto = false) {
  const state = getState();
  if (!state) return;

  closeOutDay();
  advanceEventsAfterDay(state.day);
  syncNicheTrendSnapshots(state);
  advanceKnowledgeTracks();
  markAllDirty();
  flushUiWithFallback(true);
  const summary = computeDailySummary(state);
  archiveDailyMetrics({ state, summary, day: state.day });
  archiveNicheAnalytics({ state, summary, day: state.day, timestamp: Date.now() });
  const message = auto
    ? 'You ran out of time. The grind resets tomorrow.'
    : 'You called it a day. Fresh hustle awaits tomorrow.';
  addLog(`${message} Day ${state.day + 1} begins with renewed energy.`, 'info');
  state.day += 1;
  if (state.actions && typeof state.actions === 'object') {
    for (const actionState of Object.values(state.actions)) {
      if (!actionState || typeof actionState !== 'object') continue;
      if (typeof actionState.runsToday === 'number') {
        actionState.runsToday = 0;
      }
      if (typeof actionState.lastRunDay === 'number' || actionState.lastRunDay === undefined) {
        actionState.lastRunDay = state.day;
      }
    }
  }
  if (state.hustles && typeof state.hustles === 'object') {
    for (const hustleState of Object.values(state.hustles)) {
      if (!hustleState || typeof hustleState !== 'object') continue;
      hustleState.runsToday = 0;
      hustleState.lastRunDay = state.day;
    }
  }
  state.dailyBonusTime = 0;
  getUpgradeState('coffee').usedToday = 0;
  state.timeLeft = getTimeCap();
  resetDailyMetrics(state);
  processAssistantPayroll();
  allocateAssetMaintenance();
  markAllDirty();
  flushUiWithFallback(true);
  saveState();
}

export function checkDayEnd() {
  const state = getState();
  if (!state) return;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    markDirty('dashboard');
    markDirty('headerAction');
    flushUiWithFallback(true);
    setTimeout(() => endDay(true), 400);
  }
}
