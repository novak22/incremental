import { addLog } from '../core/log.js';
import { getState, getUpgradeState } from '../core/state.js';
import { saveState } from '../core/storage.js';
import { allocateAssetMaintenance, closeOutDay } from './assets/index.js';
import { processAssistantPayroll } from './assistant.js';
import { getTimeCap } from './time.js';
import { updateUI } from '../ui/update.js';
import { advanceKnowledgeTracks, allocateDailyStudy } from './requirements.js';
import { archiveDailyMetrics, resetDailyMetrics } from './metrics.js';
import { rerollNichePopularity } from './assets/niches.js';
import { computeDailySummary } from './summary.js';
import { advanceEventsAfterDay } from './events/index.js';
import { archiveNicheAnalytics } from './analytics/niches.js';

export function endDay(auto = false) {
  const state = getState();
  if (!state) return;

  closeOutDay();
  advanceEventsAfterDay(state.day);
  advanceKnowledgeTracks();
  updateUI();
  const summary = computeDailySummary(state);
  archiveDailyMetrics({ state, summary, day: state.day });
  archiveNicheAnalytics({ state, summary, day: state.day, timestamp: Date.now() });
  const message = auto
    ? 'You ran out of time. The grind resets tomorrow.'
    : 'You called it a day. Fresh hustle awaits tomorrow.';
  addLog(`${message} Day ${state.day + 1} begins with renewed energy.`, 'info');
  state.day += 1;
  rerollNichePopularity();
  state.dailyBonusTime = 0;
  getUpgradeState('coffee').usedToday = 0;
  state.timeLeft = getTimeCap();
  resetDailyMetrics(state);
  processAssistantPayroll();
  allocateDailyStudy();
  allocateAssetMaintenance();
  updateUI();
  saveState();
}

export function checkDayEnd() {
  const state = getState();
  if (!state) return;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    updateUI();
    setTimeout(() => endDay(true), 400);
  }
}
