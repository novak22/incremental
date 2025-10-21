import { getActiveView } from './viewManager.js';
import {
  buildAssetModels,
  buildEducationModels,
  buildFinanceModel,
  buildHustleModels,
  buildTrendsModel,
  buildUpgradeModels
} from './cards/model/index.js';
import {
  renderCollections as renderSharedCollections,
  updateCollections as updateSharedCollections
} from './cards/presenters/shared.js';

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

function synthesizeModels(baseModels = {}, registries = {}, force = false) {
  const models = { ...baseModels };
  let generated = false;
  if (force || !Array.isArray(models.hustles)) {
    models.hustles = buildHustleModels(registries.hustles);
    generated = true;
  }
  if (force || !Array.isArray(models.education)) {
    models.education = buildEducationModels(registries.education);
    generated = true;
  }
  if (force || typeof models.assets !== 'object' || models.assets === null) {
    models.assets = buildAssetModels(registries.assets);
    generated = true;
  }
  if (force || typeof models.upgrades !== 'object' || models.upgrades === null) {
    models.upgrades = buildUpgradeModels(registries.upgrades, { placement: 'general' });
    generated = true;
  }
  if (typeof models.finance !== 'object' || models.finance === null) {
    models.finance = buildFinanceModel(registries);
    generated = true;
  }
  if (force || typeof models.trends !== 'object' || models.trends === null) {
    models.trends = buildTrendsModel();
    generated = true;
  }
  return { models, generated };
}

export function renderCardCollections(registries = {}, models) {
  const presenter = getActiveCardsPresenter();
  const normalizedRegistries = normalizeRegistries(registries);
  const hasModels = models !== undefined && models !== null;
  const { models: ensuredModels, generated } = synthesizeModels(
    hasModels ? models : {},
    normalizedRegistries,
    !hasModels
  );
  const payload = { registries: normalizedRegistries, models: ensuredModels };
  const presenterOptions = generated ? { skipCacheReset: true } : undefined;
  if (typeof presenter?.renderAll === 'function') {
    presenter.renderAll(payload, presenterOptions);
    return;
  }

  if (presenter?.render) {
    presenter.render(payload, presenterOptions);
    return;
  }

  renderSharedCollections(payload, {}, presenterOptions);
}

export function updateAllCards(registries = {}, models) {
  const presenter = getActiveCardsPresenter();
  const normalizedRegistries = normalizeRegistries(registries);
  const hasModels = models !== undefined && models !== null;
  const { models: ensuredModels, generated } = synthesizeModels(
    hasModels ? models : {},
    normalizedRegistries,
    !hasModels
  );
  const payload = { registries: normalizedRegistries, models: ensuredModels };
  const presenterOptions = generated ? { skipCacheReset: true } : undefined;
  if (typeof presenter?.update === 'function') {
    presenter.update(payload, presenterOptions);
    return;
  }

  updateSharedCollections(payload, {}, presenterOptions);
}

