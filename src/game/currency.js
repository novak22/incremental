import { getState } from '../core/state.js';
import { addLog } from '../core/log.js';
import { getMoneyNode } from '../ui/elements/registry.js';
import { flashValue } from '../ui/effects.js';

export function addMoney(amount, message, type = 'info') {
  const state = getState();
  if (!state) return;
  state.money = Math.max(0, Number(state.money) + Number(amount));
  const moneyNode = getMoneyNode();
  flashValue(moneyNode);
  if (message) {
    addLog(message, type);
  }
}

export function spendMoney(amount) {
  const state = getState();
  if (!state) return;
  state.money = Math.max(0, state.money - amount);
  const moneyNode = getMoneyNode();
  flashValue(moneyNode, true);
}
