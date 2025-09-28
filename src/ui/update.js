import elements from './elements.js';
import { renderCardCollections, updateAllCards } from './cards.js';
import { formatHours, formatMoney } from '../core/helpers.js';
import { getState } from '../core/state.js';
import { getTimeCap } from '../game/time.js';
import { registry } from '../game/registry.js';

export function renderCards() {
  renderCardCollections(registry);
}

export function updateUI() {
  const state = getState();
  if (!state) return;

  elements.money.textContent = `$${formatMoney(state.money)}`;
  elements.time.textContent = `${formatHours(state.timeLeft)} of ${formatHours(getTimeCap())}`;
  elements.day.textContent = state.day;

  const cap = getTimeCap();
  const percent = cap === 0 ? 0 : Math.min(100, Math.max(0, (state.timeLeft / cap) * 100));
  elements.timeProgress.style.width = `${percent}%`;

  updateAllCards(registry);
}
