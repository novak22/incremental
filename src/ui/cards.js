import { getActiveView } from './viewManager.js';
import classicCardsPresenter, {
  renderAll as renderClassicCards,
  update as updateClassicCards,
  updateCard as updateClassicCard,
  refreshUpgradeSections as classicRefreshUpgradeSections
} from './views/classic/cardsPresenter.js';

function normalizeRegistries(registries = {}) {
  return {
    hustles: Array.isArray(registries?.hustles) ? registries.hustles : [],
    education: Array.isArray(registries?.education) ? registries.education : [],
    assets: Array.isArray(registries?.assets) ? registries.assets : [],
    upgrades: Array.isArray(registries?.upgrades) ? registries.upgrades : []
  };
}

function getActiveCardsPresenter() {
  return getActiveView()?.presenters?.cards;
}

export function renderCardCollections(registries = {}, models = {}) {
  const presenter = getActiveCardsPresenter();
  const payload = { registries: normalizeRegistries(registries), models };
  if (typeof presenter?.renderAll === 'function') {
    presenter.renderAll(payload);
    return;
  }

  if (presenter?.render) {
    presenter.render(payload);
    return;
  }

  renderClassicCards(payload);
}

export function updateAllCards(registries = {}, models = {}) {
  const presenter = getActiveCardsPresenter();
  const payload = { registries: normalizeRegistries(registries), models };
  if (typeof presenter?.update === 'function') {
    presenter.update(payload);
    return;
  }

  updateClassicCards(payload);
}

export function updateCard(definition) {
  const presenter = getActiveCardsPresenter();
  if (presenter?.updateCard) {
    presenter.updateCard(definition);
    return;
  }

  updateClassicCard(definition);
}

export function refreshUpgradeSections() {
  const presenter = getActiveCardsPresenter();
  if (presenter?.refreshUpgradeSections) {
    presenter.refreshUpgradeSections();
    return;
  }

  classicRefreshUpgradeSections();
}

