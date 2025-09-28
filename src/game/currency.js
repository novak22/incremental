import { getState } from '../core/state.js';
import { addLog } from '../core/log.js';
import elements from '../ui/elements.js';
import { flashValue } from '../ui/effects.js';

export function addMoney(amount, message, type = 'info') {
  const state = getState();
  if (!state) return;
  state.money = Math.max(0, Number(state.money) + Number(amount));
  flashValue(elements.money);
  if (message) {
    addLog(message, type);
  }
}

export function spendMoney(amount) {
  const state = getState();
  if (!state) return;
  state.money = Math.max(0, state.money - amount);
  flashValue(elements.money, true);
}
