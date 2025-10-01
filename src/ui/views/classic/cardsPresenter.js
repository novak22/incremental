import {
  cacheEducationModels,
  isStudyDefinition,
  renderStudySection,
  updateStudySection,
  updateStudyTrack
} from './studySection.js';
import {
  cacheHustleModels,
  getCachedHustleModel,
  hasHustleCard,
  renderHustles,
  updateHustleCard
} from './hustleCards.js';
import assetCards from './assetCards.js';
import {
  cacheUpgradeModels,
  findUpgradeModelById,
  isUpgradeDefinition,
  refreshUpgradeSections as refreshUpgradeSectionsModule,
  renderUpgradeDock,
  renderUpgradeOverview,
  renderUpgrades,
  updateUpgradeCard,
  updateUpgrades
} from './upgradeCards.js';

function normalizeRegistries(registries = {}) {
  return {
    hustles: Array.isArray(registries?.hustles) ? registries.hustles : [],
    education: Array.isArray(registries?.education) ? registries.education : [],
    assets: Array.isArray(registries?.assets) ? registries.assets : [],
    upgrades: Array.isArray(registries?.upgrades) ? registries.upgrades : []
  };
}

function cacheCardModels(models = {}, options = {}) {
  const { skipCacheReset = false } = options;
  cacheHustleModels(models?.hustles ?? [], { skipCacheReset });
  cacheEducationModels(models?.education);
  cacheUpgradeModels(models?.upgrades);
}

function normalizeAssetModels(models) {
  if (models && typeof models === 'object' && !Array.isArray(models)) {
    return {
      groups: Array.isArray(models.groups) ? models.groups : [],
      launchers: Array.isArray(models.launchers) ? models.launchers : []
    };
  }
  return { groups: [], launchers: [] };
}

function renderClassicCollections(registries, models) {
  const { hustles = [], education = [], assets = [], upgrades = [] } = registries;
  renderHustles(hustles, models?.hustles ?? []);
  assetCards.renderAssets(assets, normalizeAssetModels(models?.assets));
  renderUpgrades(upgrades, models?.upgrades);
  renderStudySection(education, models?.education);
}

export function renderAll({ registries = {}, models = {} } = {}, options = {}) {
  const normalized = normalizeRegistries(registries);
  cacheCardModels(models, options);
  renderClassicCollections(normalized, models);
}

function updateClassicCollections(registries, models) {
  const { hustles = [], education = [], assets = [], upgrades = [] } = registries;
  const modelMap = new Map((models?.hustles ?? []).map(model => [model?.id, model]));
  hustles.forEach(definition => {
    const model = modelMap.get(definition.id) || getCachedHustleModel(definition.id);
    updateHustleCard(definition, model, { emitEvent: emitUIEvent });
  });
  assetCards.updateAssets(assets, normalizeAssetModels(models?.assets));
  updateUpgrades(upgrades, models?.upgrades);
  updateStudySection(education, models?.education);
  emitUIEvent('upgrades:state-updated');
}

export function update({ registries = {}, models = {} } = {}, options = {}) {
  const normalized = normalizeRegistries(registries);
  cacheCardModels(models, options);
  updateClassicCollections(normalized, models);
}

export function updateCard(definition) {
  if (!definition?.id) {
    return;
  }

  if (hasHustleCard(definition.id)) {
    const model = getCachedHustleModel(definition.id);
    updateHustleCard(definition, model, { emitEvent: emitUIEvent });
    return;
  }

  if (assetCards.isAssetDefinition(definition.id)) {
    assetCards.updateAssetGroup(definition.id);
    return;
  }

  if (isUpgradeDefinition(definition.id)) {
    const model = findUpgradeModelById(definition.id);
    updateUpgradeCard(definition, model);
    renderUpgradeDock();
    renderUpgradeOverview();
    refreshUpgradeSectionsModule();
    emitUIEvent('upgrades:state-updated');
    return;
  }

  if (isStudyDefinition(definition)) {
    updateStudyTrack(definition);
  }
}

export function refreshUpgradeSections() {
  refreshUpgradeSectionsModule();
}

function emitUIEvent(name) {
  if (typeof document?.createEvent === 'function') {
    const event = document.createEvent('Event');
    event.initEvent(name, true, true);
    document.dispatchEvent(event);
    return;
  }
  if (typeof Event === 'function') {
    document.dispatchEvent(new Event(name));
  }
}

const classicCardsPresenter = {
  renderAll,
  update,
  updateCard,
  refreshUpgradeSections
};

export default classicCardsPresenter;
