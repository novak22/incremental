import { renderCardCollections, updateAllCards } from './cards.js';
import { renderDashboard } from './dashboard.js';
import { getActiveView } from './viewManager.js';
import cardCollectionService from './cards/collectionService.js';
import { buildPlayerPanelModel } from './player/model.js';
import { buildSkillsWidgetModel } from './skillsWidget/model.js';
import { buildHeaderActionModel } from './headerAction/model.js';
import { renderHeaderAction } from './headerAction/index.js';
import { applyCardFilters } from './layout/index.js';
import {
  ALL_UI_SECTIONS,
  EVENT_TOPICS,
  subscribe,
  subscribeToInvalidation
} from '../core/events/invalidationBus.js';
import { getElement } from './elements/registry.js';
import { flashValue } from './effects.js';
import { selectGameState } from './selectors/state.js';
import { selectDashboardSummary } from './selectors/dashboard.js';

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

function handleMoneyChanged(event = {}) {
  const moneyNode = getElement('money');
  if (!moneyNode) {
    return;
  }
  const negative = event.direction === 'spend' || Number(event.amount) < 0;
  flashValue(moneyNode, negative);
}

let subscriptionsInitialized = false;
let unsubscribeInvalidation = null;
let unsubscribeMoneyChanged = null;

export function ensureUpdateSubscriptions() {
  if (subscriptionsInitialized) {
    return;
  }
  unsubscribeInvalidation = subscribeToInvalidation(updateUI);
  unsubscribeMoneyChanged = subscribe(EVENT_TOPICS.moneyChanged, handleMoneyChanged);
  subscriptionsInitialized = true;
}

export function teardownUpdateSubscriptions() {
  unsubscribeInvalidation?.();
  unsubscribeMoneyChanged?.();
  subscriptionsInitialized = false;
  unsubscribeInvalidation = null;
  unsubscribeMoneyChanged = null;
}

function buildDefaultOptions() {
  return ALL_UI_SECTIONS.reduce((acc, section) => {
    acc[section] = true;
    return acc;
  }, {});
}

function normalizeOptions(options) {
  if (!options) {
    return buildDefaultOptions();
  }

  return ALL_UI_SECTIONS.reduce((acc, section) => {
    acc[section] = Boolean(options[section]);
    return acc;
  }, {});
}

function hasUpdates(flags) {
  return ALL_UI_SECTIONS.some(section => flags[section]);
}

export function updateUI(options) {
  const state = selectGameState();
  if (!state) return;

  const flags = normalizeOptions(options);
  if (!hasUpdates(flags)) {
    return;
  }

  const activeView = getActiveView();

  if (flags.dashboard) {
    const summary = selectDashboardSummary(state);
    if (activeView?.renderDashboard) {
      activeView.renderDashboard(state, summary);
    } else {
      renderDashboard(state, summary);
    }
  }

  const presenters = activeView?.presenters || {};

  if (flags.player) {
    const playerPresenter = presenters.player;
    if (playerPresenter?.render) {
      const playerModel = buildPlayerPanelModel(state);
      playerPresenter.render(playerModel);
    }
  }

  if (flags.skillsWidget) {
    const skillsPresenter = presenters.skillsWidget;
    if (skillsPresenter?.render) {
      const skillsModel = buildSkillsWidgetModel(state);
      skillsPresenter.render(skillsModel);
    }
  }

  if (flags.headerAction) {
    const headerModel = buildHeaderActionModel(state);
    renderHeaderAction(headerModel);
  }

  if (flags.cards) {
    const { registries, models, handled } = dispatchCardCollections('update', activeView);
    if (!handled) {
      updateAllCards(registries, models);
      applyCardFilters(models);
    }
  }
}
