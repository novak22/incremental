import { renderCardCollections, updateAllCards } from './cards.js';
import { getState } from '../core/state.js';
import { configureRegistry } from '../core/state/registry.js';
import { getRegistry } from '../game/registryService.js';
import { loadDefaultRegistry } from '../game/registryLoader.js';
import { computeDailySummary } from '../game/summary.js';
import { renderDashboard } from './dashboard.js';
import { refreshActionCatalogDebug } from './debugCatalog.js';
import { getActiveView } from './viewManager.js';
import {
  buildAssetModels,
  buildEducationModels,
  buildHustleModels,
  buildUpgradeModels
} from './cards/model.js';
import { buildPlayerPanelModel } from './player/model.js';
import { buildSkillsWidgetModel } from './skillsWidget/model.js';
import { buildHeaderActionModel } from './headerAction/model.js';
import { renderHeaderAction } from './headerAction/index.js';
import { applyCardFilters } from './layout/index.js';
import playerPresenterClassic from './views/classic/playerPresenter.js';
import skillsWidgetPresenterClassic from './views/classic/skillsWidgetPresenter.js';

function resolveRegistrySnapshot() {
  try {
    return getRegistry();
  } catch (error) {
    const message = typeof error?.message === 'string' ? error.message : '';
    if (!message.includes('Registry definitions have not been loaded')) {
      throw error;
    }

    loadDefaultRegistry();
    configureRegistry();
    return getRegistry();
  }
}

function buildCollections() {
  const registry = resolveRegistrySnapshot();
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
  const { models = {}, ...registries } = collections;
  const presenter = getActiveView()?.presenters?.cards;
  const payload = { registries, models };

  if (typeof presenter?.renderAll === 'function') {
    presenter.renderAll(payload);
    applyCardFilters(models);
    return;
  }

  if (typeof presenter?.render === 'function') {
    presenter.render(payload);
    applyCardFilters(models);
    return;
  }

  renderCardCollections(registries, models);
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

  const collections = buildCollections();
  const { models = {}, ...registries } = collections;
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
