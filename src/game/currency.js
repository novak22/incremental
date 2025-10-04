import { defaultStateManager } from '../core/state.js';
import { addLog } from '../core/log.js';
import { markDirty, publish, EVENT_TOPICS } from '../core/events/invalidationBus.js';

const MONEY_UI_SECTIONS = ['dashboard', 'player', 'skillsWidget', 'headerAction'];

export function createCurrencyModule({
  stateManager = defaultStateManager,
  getState = () => stateManager?.getState?.() ?? null,
  addLog: logMessage = addLog,
  publish: publishEvent = publish,
  markDirty: markSectionsDirty = markDirty
} = {}) {
  function addMoney(amount, message, type = 'info') {
    const state = getState();
    if (!state) return;
    state.money = Math.max(0, Number(state.money) + Number(amount));
    publishEvent(EVENT_TOPICS.moneyChanged, {
      direction: amount >= 0 ? 'gain' : 'spend',
      amount: Number(amount),
      total: state.money
    });
    markSectionsDirty(MONEY_UI_SECTIONS);
    if (message) {
      logMessage(message, type);
    }
  }

  function spendMoney(amount) {
    const state = getState();
    if (!state) return;
    state.money = Math.max(0, state.money - amount);
    publishEvent(EVENT_TOPICS.moneyChanged, {
      direction: 'spend',
      amount: Number(amount) * -1,
      total: state.money
    });
    markSectionsDirty(MONEY_UI_SECTIONS);
  }

  return { addMoney, spendMoney };
}

const defaultCurrencyModule = createCurrencyModule();

export const addMoney = defaultCurrencyModule.addMoney;
export const spendMoney = defaultCurrencyModule.spendMoney;
