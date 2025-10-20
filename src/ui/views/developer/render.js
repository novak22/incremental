import { getState } from '../../../core/state.js';
import { setText } from './dom.js';
import { renderOverview } from './overview.js';
import { renderEvents } from './events.js';
import { renderEducationBuffs } from './education.js';
import { renderUpgradeBuffs } from './upgrades.js';
import { renderActionMemory } from './actions.js';
import { renderTimeBuffs } from './time.js';
import { renderStateDump } from './stateDump.js';

export function renderDeveloperView(rootDocument = document) {
  const doc = rootDocument || document;
  const container = doc.getElementById('developer-root');
  if (!container) return;

  const state = getState();
  if (!state) {
    setText(container, '#developer-state-json', 'State manager not initialized.');
    return;
  }

  renderOverview(container, state);
  renderEvents(container, state);
  renderEducationBuffs(container, state);
  renderUpgradeBuffs(container, state);
  renderActionMemory(container, state);
  renderTimeBuffs(container, state);
  renderStateDump(container, state);
}

