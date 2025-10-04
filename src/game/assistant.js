import { formatMoney } from '../core/helpers.js';
import { addLog } from '../core/log.js';
import { getState, getUpgradeState } from '../core/state.js';
import { spendMoney } from './currency.js';
import { gainTime } from './time.js';
import { recordCostContribution } from './metrics.js';
import { awardSkillProgress } from './skills/index.js';
import { markDirty } from '../ui/invalidation.js';

const CORE_UI_SECTIONS = ['dashboard', 'player', 'skillsWidget', 'headerAction'];

export const ASSISTANT_CONFIG = {
  hiringCost: 180,
  hourlyRate: 8,
  hoursPerAssistant: 3,
  maxAssistants: 4
};

function getAssistantState(target = getState()) {
  return getUpgradeState('assistant', target);
}

export function getAssistantCount(target = getState()) {
  const state = getAssistantState(target);
  const count = Number(state.count) || 0;
  return Math.max(0, Math.min(ASSISTANT_CONFIG.maxAssistants, count));
}

export function getAssistantDailyCost(target = getState()) {
  return (
    getAssistantCount(target) *
    ASSISTANT_CONFIG.hoursPerAssistant *
    ASSISTANT_CONFIG.hourlyRate
  );
}

export function canHireAssistant(target = getState()) {
  const state = target || getState();
  if (!state) return false;
  if (getAssistantCount(state) >= ASSISTANT_CONFIG.maxAssistants) return false;
  return state.money >= ASSISTANT_CONFIG.hiringCost;
}

export function hireAssistant() {
  const state = getState();
  if (!state) return false;
  const upgrade = getAssistantState(state);
  const currentCount = getAssistantCount(state);
  if (currentCount >= ASSISTANT_CONFIG.maxAssistants) return false;
  if (state.money < ASSISTANT_CONFIG.hiringCost) {
    addLog('You need more cash before onboarding another assistant.', 'warning');
    return false;
  }

  spendMoney(ASSISTANT_CONFIG.hiringCost);
  recordCostContribution({
    key: 'assistant:hiring',
    label: '🤝 Assistant onboarding',
    amount: ASSISTANT_CONFIG.hiringCost,
    category: 'investment'
  });
  awardSkillProgress({
    skills: ['commerce'],
    moneySpent: ASSISTANT_CONFIG.hiringCost,
    label: 'hiring a Virtual Assistant'
  });
  upgrade.count = currentCount + 1;
  state.bonusTime += ASSISTANT_CONFIG.hoursPerAssistant;
  gainTime(ASSISTANT_CONFIG.hoursPerAssistant);
  markDirty(CORE_UI_SECTIONS);
  addLog(
    `You hired a virtual assistant! They add +${ASSISTANT_CONFIG.hoursPerAssistant}h and expect $${ASSISTANT_CONFIG.hourlyRate}/hr.`,
    'upgrade'
  );
  return true;
}

export function canFireAssistant(target = getState()) {
  return getAssistantCount(target) > 0;
}

export function fireAssistant() {
  const state = getState();
  if (!state) return false;
  const upgrade = getAssistantState(state);
  const currentCount = getAssistantCount(state);
  if (currentCount <= 0) return false;

  upgrade.count = currentCount - 1;
  state.bonusTime = Math.max(0, state.bonusTime - ASSISTANT_CONFIG.hoursPerAssistant);
  state.timeLeft -= ASSISTANT_CONFIG.hoursPerAssistant;
  markDirty(CORE_UI_SECTIONS);
  markDirty('cards');
  addLog(
    `You let an assistant go. Daily support drops by ${ASSISTANT_CONFIG.hoursPerAssistant}h, but payroll eases a bit.`,
    'info'
  );
  return true;
}

export function processAssistantPayroll() {
  const state = getState();
  if (!state) return;
  const count = getAssistantCount(state);
  if (count <= 0) return;

  const totalCost = getAssistantDailyCost(state);
  if (totalCost <= 0) return;

  const hadFunds = state.money >= totalCost;
  const coveredHours = count * ASSISTANT_CONFIG.hoursPerAssistant;
  spendMoney(totalCost);
  recordCostContribution({
    key: 'assistant:payroll',
    label: '🤖 Assistant payroll',
    amount: totalCost,
    category: 'payroll'
  });
  const formatted = formatMoney(totalCost);
  if (hadFunds) {
    addLog(
      `Assistant payroll cleared at $${formatted} for ${count} teammate${count === 1 ? '' : 's'} covering ${coveredHours} upkeep hour${coveredHours === 1 ? '' : 's'}.`,
      'info'
    );
  } else {
    addLog(
      `Assistant payroll of $${formatted} came due, but your balance ran dry. They still covered ${coveredHours} upkeep hour${coveredHours === 1 ? '' : 's'}—just no cash cushion left.`,
      'warning'
    );
  }
}
