import { renderCardCollections, updateAllCards } from './cards.js';
import { getState } from '../core/state.js';
import { computeDailySummary } from '../game/summary.js';
import { renderDashboard } from './dashboard.js';
import { refreshActionCatalogDebug } from './debugCatalog.js';
import { getActiveView } from './viewManager.js';
import cardCollectionService from './cards/collectionService.js';
import { buildPlayerPanelModel } from './player/model.js';
import { buildSkillsWidgetModel } from './skillsWidget/model.js';
import { buildHeaderActionModel } from './headerAction/model.js';
import { renderHeaderAction } from './headerAction/index.js';
import { applyCardFilters } from './layout/index.js';
import playerPresenterClassic from './views/classic/playerPresenter.js';
import skillsWidgetPresenterClassic from './views/classic/skillsWidgetPresenter.js';

export function renderCards() {
  cardCollectionService.refreshCollections();
  const { registries, models } = cardCollectionService.getCollections();
  const presenter = getActiveView()?.presenters?.cards;
  const payload = { registries, models };

  if (typeof presenter?.renderAll === 'function') {
    presenter.renderAll(payload);
  } else if (typeof presenter?.render === 'function') {
    presenter.render(payload);
  } else {
    renderCardCollections(registries, models);
  }

  applyCardFilters(models);
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
  const presenters = activeView?.presenters || {};
  const playerPresenter = presenters.player || playerPresenterClassic;
  const skillsPresenter = presenters.skillsWidget || skillsWidgetPresenterClassic;
  const playerModel = buildPlayerPanelModel(state);
  playerPresenter?.render?.(playerModel);

  const skillsModel = buildSkillsWidgetModel(state);
  skillsPresenter?.render?.(skillsModel);

  const headerModel = buildHeaderActionModel(state);
  renderHeaderAction(headerModel);

  cardCollectionService.refreshCollections();
  const { registries, models } = cardCollectionService.getCollections();
  const presenter = activeView?.presenters?.cards;
  const payload = { registries, models };

  if (typeof presenter?.update === 'function') {
    presenter.update(payload);
  } else {
    updateAllCards(registries, models);
    applyCardFilters(models);
  }
  refreshActionCatalogDebug();
}
