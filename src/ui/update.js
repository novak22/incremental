import { renderCardCollections, updateAllCards } from './cards.js';
import { getState } from '../core/state.js';
import { registry } from '../game/registry.js';
import { computeDailySummary } from '../game/summary.js';
import { renderDashboard } from './dashboard.js';
import { renderSkillWidgets } from './skillsWidget.js';
import { updateHeaderAction } from './headerAction.js';
import { applyCardFilters } from './layout.js';
import { refreshActionCatalogDebug } from './debugCatalog.js';
import { renderPlayerPanel } from './player.js';
import { getActiveView } from './viewManager.js';
import {
  buildAssetModels,
  buildEducationModels,
  buildHustleModels,
  buildUpgradeModels
} from './cards/model.js';

function buildCollections() {
  const hustles = registry.hustles.filter(hustle => hustle.tag?.type !== 'study');
  const education = registry.hustles.filter(hustle => hustle.tag?.type === 'study');
  const assets = registry.assets;
  const upgrades = registry.upgrades;
  return {
    hustles,
    education,
    assets,
    upgrades,
    models: {
      hustles: buildHustleModels(hustles),
      education: buildEducationModels(education),
      assets: buildAssetModels(assets),
      upgrades: buildUpgradeModels(upgrades)
    }
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
  const activeView = getActiveView();
  if (activeView?.renderDashboard) {
    activeView.renderDashboard(state, summary);
  } else {
    renderDashboard(state, summary);
  }
  renderSkillWidgets(state);
  renderPlayerPanel(state, summary);
  updateHeaderAction(state);

  const collections = buildCollections();
  updateAllCards(collections);
  applyCardFilters();
  refreshActionCatalogDebug();
}
