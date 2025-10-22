import { computeDailySummary } from '../../game/summary.js';
import { buildDashboardViewModel } from '../dashboard/model.js';
import { selectGameState } from './state.js';

/**
 * Computes the dashboard summary for the provided or current state.
 * @param {object} [state]
 * @returns {object|null}
 */
export function selectDashboardSummary(state = selectGameState()) {
  if (!state) {
    return null;
  }
  return computeDailySummary(state);
}

/**
 * Builds the dashboard view model used by presenters.
 * @param {object} [state]
 * @param {object|null} [summary]
 * @returns {object|null}
 */
export function selectDashboardViewModel(state = selectGameState(), summary = selectDashboardSummary(state)) {
  if (!state || !summary) {
    return null;
  }
  return buildDashboardViewModel(state, summary);
}
