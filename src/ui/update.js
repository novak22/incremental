import { renderCardCollections, updateAllCards } from './cards.js';
import { getState } from '../core/state.js';
import { computeDailySummary } from '../game/summary.js';
import { renderDashboard } from './dashboard.js';
import { getActiveView } from './viewManager.js';
import cardCollectionService from './cards/collectionService.js';
import { buildPlayerPanelModel } from './player/model.js';
import { buildSkillsWidgetModel } from './skillsWidget/model.js';
import { buildHeaderActionModel } from './headerAction/model.js';
import { renderHeaderAction } from './headerAction/index.js';
import { applyCardFilters } from './layout/index.js';

function dispatchCardCollections(mode, activeView = getActiveView()) {
  cardCollectionService.refreshCollections();
  const { registries, models } = cardCollectionService.getCollections();
  const presenter = activeView?.presenters?.cards;
  const payload = { registries, models };

  let handled = false;

  if (mode === 'renderAll') {
    if (typeof presenter?.renderAll === 'function') {
      presenter.renderAll(payload);
      handled = true;
    } else if (typeof presenter?.render === 'function') {
      presenter.render(payload);
      handled = true;
    }
  } else if (mode === 'render') {
    if (typeof presenter?.render === 'function') {
      presenter.render(payload);
      handled = true;
    }
  } else if (mode === 'update') {
    if (typeof presenter?.update === 'function') {
      presenter.update(payload);
      handled = true;
    }
  }

  return { registries, models, handled };
}

export function renderCards() {
  const { registries, models, handled } = dispatchCardCollections('renderAll');
  if (!handled) {
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
  const playerPresenter = presenters.player;
  if (playerPresenter?.render) {
    const playerModel = buildPlayerPanelModel(state);
    playerPresenter.render(playerModel);
  }

  const skillsPresenter = presenters.skillsWidget;
  if (skillsPresenter?.render) {
    const skillsModel = buildSkillsWidgetModel(state);
    skillsPresenter.render(skillsModel);
  }

  const headerModel = buildHeaderActionModel(state);
  renderHeaderAction(headerModel);

  const { registries, models, handled } = dispatchCardCollections('update', activeView);
  if (!handled) {
    updateAllCards(registries, models);
    applyCardFilters(models);
  }
}
