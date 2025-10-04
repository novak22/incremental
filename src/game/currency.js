import { getState } from '../core/state.js';
import { addLog } from '../core/log.js';
import { getElement } from '../ui/elements/registry.js';
import { flashValue } from '../ui/effects.js';
import { markDirty } from '../ui/invalidation.js';

const MONEY_UI_SECTIONS = ['dashboard', 'player', 'skillsWidget', 'headerAction'];

export function addMoney(amount, message, type = 'info') {
  const state = getState();
  if (!state) return;
  state.money = Math.max(0, Number(state.money) + Number(amount));
  const moneyNode = getElement('money');
  flashValue(moneyNode);
  markDirty(MONEY_UI_SECTIONS);
  if (message) {
    addLog(message, type);
  }
}

export function spendMoney(amount) {
  const state = getState();
  if (!state) return;
  state.money = Math.max(0, state.money - amount);
  const moneyNode = getElement('money');
  flashValue(moneyNode, true);
  markDirty(MONEY_UI_SECTIONS);
}
