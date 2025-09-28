import { getState } from '../core/state.js';

export function getTimeCap() {
  const state = getState();
  if (!state) return 0;
  return state.baseTime + state.bonusTime + state.dailyBonusTime;
}

export function spendTime(hours) {
  const state = getState();
  if (!state) return;
  state.timeLeft -= hours;
}

export function gainTime(hours) {
  const state = getState();
  if (!state) return;
  state.timeLeft = Math.min(getTimeCap(), state.timeLeft + hours);
}
