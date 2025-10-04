import { getState } from '../core/state.js';
import { markDirty } from '../ui/invalidation.js';

const TIME_UI_SECTIONS = ['dashboard', 'player', 'skillsWidget', 'headerAction'];

export function getTimeCap() {
  const state = getState();
  if (!state) return 0;
  return state.baseTime + state.bonusTime + state.dailyBonusTime;
}

export function spendTime(hours) {
  const state = getState();
  if (!state) return;
  state.timeLeft -= hours;
  markDirty(TIME_UI_SECTIONS);
}

export function gainTime(hours) {
  const state = getState();
  if (!state) return;
  state.timeLeft = Math.min(getTimeCap(), state.timeLeft + hours);
  markDirty(TIME_UI_SECTIONS);
}
