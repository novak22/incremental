import * as hustleCards from './hustleCardView.js';
import * as assetCards from './assetCardView.js';
import * as upgradeCards from './upgradeCardView.js';
import * as studyCards from './studyCardView.js';
import {
  createAssetDetailHighlights,
  createBadge,
  createDefinitionSummary,
  createInstanceNicheSelector,
  createInstanceQuickActions,
  emitUIEvent,
  showSlideOver
} from './shared.js';

export {
  createAssetDetailHighlights,
  createBadge,
  createDefinitionSummary,
  createInstanceNicheSelector,
  createInstanceQuickActions,
  emitUIEvent,
  showSlideOver
};

export function renderCardCollections({ hustles = [], education = [], assets = [], upgrades = [] }) {
  hustleCards.render(hustles);
  assetCards.render(assets);
  upgradeCards.render(upgrades);
  studyCards.render(education);
}

export function updateCard(definition) {
  if (!definition) return;
  hustleCards.update(definition);
  assetCards.update(definition);

  const wasUpgrade = upgradeCards.hasUpgrade?.(definition.id);
  upgradeCards.update(definition);
  const isUpgrade = wasUpgrade || upgradeCards.hasUpgrade?.(definition.id);
  if (isUpgrade) {
    upgradeCards.ensureCurrentDefinitions([definition]);
    const current = upgradeCards.getCurrentDefinitions();
    const overviewSource = current.length ? current : [definition];
    upgradeCards.renderOverview(overviewSource);
    upgradeCards.renderDock();
    upgradeCards.refreshSections();
    emitUIEvent('upgrades:state-updated');
  }

  studyCards.update(definition);
}

export function updateAllCards({ hustles = [], education = [], assets = [], upgrades = [] }) {
  hustles.forEach(hustleCards.update);
  assets.forEach(assetCards.update);

  upgradeCards.ensureCurrentDefinitions(upgrades);
  upgrades.forEach(upgradeCards.update);
  const current = upgradeCards.getCurrentDefinitions();
  const overviewSource = current.length ? current : upgrades;
  upgradeCards.renderOverview(overviewSource);
  upgradeCards.renderDock();
  upgradeCards.refreshSections();
  emitUIEvent('upgrades:state-updated');

  education.forEach(studyCards.update);
}
