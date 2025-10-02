import { formatMoney } from '../../core/helpers.js';
import { getState } from '../../core/state.js';
import { executeAction } from '../actions.js';
import { checkDayEnd } from '../lifecycle.js';
import {
  ASSISTANT_CONFIG,
  canFireAssistant,
  canHireAssistant,
  fireAssistant,
  getAssistantCount,
  getAssistantDailyCost,
  hireAssistant
} from '../assistant.js';

function buildAssistantDetails() {
  return [
    () => `💵 Hiring Cost: <strong>$${formatMoney(ASSISTANT_CONFIG.hiringCost)}</strong>`,
    () => `👥 Team Size: <strong>${getAssistantCount()} / ${ASSISTANT_CONFIG.maxAssistants}</strong>`,
    () => `⏳ Support: <strong>+${ASSISTANT_CONFIG.hoursPerAssistant}h per assistant</strong>`,
    () =>
      `💰 Payroll: <strong>$${formatMoney(
        ASSISTANT_CONFIG.hourlyRate * ASSISTANT_CONFIG.hoursPerAssistant
      )}</strong> each day per assistant`,
    () => `📅 Current Payroll: <strong>$${formatMoney(getAssistantDailyCost())} / day</strong>`
  ];
}

function createFireButton(card) {
  const row = document.createElement('div');
  row.className = 'inline-actions';
  const fireButton = document.createElement('button');
  fireButton.className = 'secondary';
  fireButton.type = 'button';
  fireButton.textContent = 'Fire Assistant';
  fireButton.addEventListener('click', () => {
    if (fireButton.disabled) return;
    executeAction(() => {
      const removed = fireAssistant();
      if (removed && getState().timeLeft <= 0) {
        checkDayEnd();
      }
    });
  });
  row.appendChild(fireButton);
  card.appendChild(row);
  return { fireButton };
}

export const assistantHooks = {
  details: buildAssistantDetails(),
  actionLabel: () =>
    getAssistantCount() >= ASSISTANT_CONFIG.maxAssistants ? 'Assistant Team Full' : 'Hire Assistant',
  disabled: () => !canHireAssistant(),
  onPurchase: () => {
    hireAssistant();
  },
  extraContent: card => createFireButton(card),
  update: (_state, ui) => {
    if (!ui?.extra?.fireButton) return;
    const count = getAssistantCount();
    ui.extra.fireButton.disabled = !canFireAssistant();
    ui.extra.fireButton.textContent = count > 0 ? 'Fire Assistant' : 'No Assistants Hired';
  }
};
