import { getState } from '../core/state.js';
import { addLog } from '../core/log.js';
import { markDirty, publish, EVENT_TOPICS } from '../core/events/invalidationBus.js';

const MONEY_UI_SECTIONS = ['dashboard', 'player', 'skillsWidget', 'headerAction'];

export function addMoney(amount, message, type = 'info') {
  const state = getState();
  if (!state) return;
  state.money = Math.max(0, Number(state.money) + Number(amount));
  publish(EVENT_TOPICS.moneyChanged, {
    direction: amount >= 0 ? 'gain' : 'spend',
    amount: Number(amount),
    total: state.money
  });
  markDirty(MONEY_UI_SECTIONS);
  if (message) {
    addLog(message, type);
  }
}

export function spendMoney(amount) {
  const state = getState();
  if (!state) return;
  state.money = Math.max(0, state.money - amount);
  publish(EVENT_TOPICS.moneyChanged, {
    direction: 'spend',
    amount: Number(amount) * -1,
    total: state.money
  });
  markDirty(MONEY_UI_SECTIONS);
}
