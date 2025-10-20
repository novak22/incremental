import { formatHours } from '../../../core/helpers.js';
import { setText } from './dom.js';

export function renderTimeBuffs(container, state) {
  const base = formatHours(Math.max(0, Number(state?.baseTime) || 0));
  const bonus = formatHours(Math.max(0, Number(state?.bonusTime) || 0));
  const daily = formatHours(Math.max(0, Number(state?.dailyBonusTime) || 0));

  setText(container, '[data-dev-field="baseTime"]', base);
  setText(container, '[data-dev-field="bonusTime"]', bonus);
  setText(container, '[data-dev-field="dailyBonus"]', daily);
}

