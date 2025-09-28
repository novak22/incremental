import { addLog } from '../core/log.js';
import { getState, getUpgradeState } from '../core/state.js';
import { saveState } from '../core/storage.js';
import { allocateAssetMaintenance, closeOutDay } from './assets.js';
import { getTimeCap } from './time.js';
import { updateUI } from '../ui/update.js';

export function endDay(auto = false) {
  const state = getState();
  if (!state) return;

  closeOutDay();
  const message = auto
    ? 'You ran out of time. The grind resets tomorrow.'
    : 'You called it a day. Fresh hustle awaits tomorrow.';
  addLog(`${message} Day ${state.day + 1} begins with renewed energy.`, 'info');
  state.day += 1;
  state.dailyBonusTime = 0;
  getUpgradeState('coffee').usedToday = 0;
  state.timeLeft = getTimeCap();
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
