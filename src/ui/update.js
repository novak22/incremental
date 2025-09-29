import { renderCardCollections, updateAllCards } from './cards.js';
import { getState } from '../core/state.js';
import { registry } from '../game/registry.js';
import { computeDailySummary } from '../game/summary.js';
import { renderDashboard } from './dashboard.js';
import { renderSkillWidgets } from './skillsWidget.js';
import { updateHeaderAction } from './headerAction.js';
import { applyCardFilters } from './layout.js';
import { refreshActionCatalogDebug } from './debugCatalog.js';

function buildCollections() {
  const hustles = registry.hustles.filter(hustle => hustle.tag?.type !== 'study');
  const education = registry.hustles.filter(hustle => hustle.tag?.type === 'study');
  return {
    hustles,
    education,
    assets: registry.assets,
    upgrades: registry.upgrades
  };
}

export function renderCards() {
  const collections = buildCollections();
  renderCardCollections(collections);
  applyCardFilters();
}

export function updateUI() {
  const state = getState();
  if (!state) return;

  const summary = computeDailySummary(state);
  renderDashboard(summary);
  renderSkillWidgets(state);
  updateHeaderAction(state);

  const collections = buildCollections();
  updateAllCards(collections);
  applyCardFilters();
  refreshActionCatalogDebug();
}
