import { addLog } from '../core/log.js';
import { getState, getUpgradeState } from '../core/state.js';
import { saveState } from '../core/storage.js';
import { allocateAssetMaintenance, closeOutDay } from './assets/index.js';
import { processAssistantPayroll } from './assistant.js';
import { getTimeCap } from './time.js';
import { flushDirty, markAllDirty, markDirty } from '../core/events/invalidationBus.js';
import { advanceKnowledgeTracks, allocateDailyStudy } from './requirements.js';
import { archiveDailyMetrics, resetDailyMetrics } from './metrics.js';
import { rerollNichePopularity } from './assets/niches.js';
import { computeDailySummary } from './summary.js';
import { advanceEventsAfterDay } from './events/index.js';
import { archiveNicheAnalytics } from './analytics/niches.js';

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
  if (state.hustles && typeof state.hustles === 'object') {
    for (const hustleState of Object.values(state.hustles)) {
      if (!hustleState || typeof hustleState !== 'object') continue;
      hustleState.runsToday = 0;
      hustleState.lastRunDay = state.day;
    }
  }
  rerollNichePopularity();
  state.dailyBonusTime = 0;
  getUpgradeState('coffee').usedToday = 0;
  state.timeLeft = getTimeCap();
  resetDailyMetrics(state);
  processAssistantPayroll();
  allocateDailyStudy();
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
