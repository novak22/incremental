import registry, { getElement } from '../../../elements/registry.js';
import { getState } from '../../../../core/state.js';
import { applyCardFilters } from '../../../layout/index.js';
import {
  storeAssetCaches,
  resolveAssetModels,
  isAssetDefinition,
  getGroupForDefinition,
  getCurrentAssetModels
} from './cache.js';
import {
  buildAssetHub,
  createAssetGroupSection,
  openInstanceDetails,
  openAssetGroupDetails,
  buildAssetSummary,
  getAssetGroupUi,
  clearAssetGroupUi
} from './renderers.js';

let assetPortfolioNode = null;
let assetHubNode = null;
let assetEmptyNotice = null;

function resolveAssetGalleryContainer() {
  const gallery = getElement('assetGallery');
  if (gallery) {
    return gallery;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  const fallback = document.getElementById('venture-gallery')
    || document.getElementById('asset-gallery');

  if (fallback && typeof registry?.cache?.set === 'function') {
    registry.cache.set('assetGallery', fallback);
  }

  return fallback;
}

function updateAssetEmptyNotice(totalInstances) {
  if (!assetEmptyNotice) return;
  assetEmptyNotice.hidden = totalInstances > 0;
}

function mountHub(container, hub) {
  if (!container) return;
  container.innerHTML = '';
  container.appendChild(hub);
}

function renderAssets(definitions = [], assetModels = getCurrentAssetModels()) {
  const normalizedModels = resolveAssetModels(definitions, assetModels);
  storeAssetCaches({ definitions, models: normalizedModels });

  const container = resolveAssetGalleryContainer();
  if (!container) return;

  clearAssetGroupUi();
  const state = getState();
  const { container: hub, totalInstances, emptyNotice } = buildAssetHub(
    normalizedModels.groups,
    normalizedModels.launchers,
    state
  );

  mountHub(container, hub);
  assetHubNode = hub;
  assetPortfolioNode = container;
  assetEmptyNotice = emptyNotice || hub.querySelector('.venture-summary__empty') || null;

  updateAssetEmptyNotice(totalInstances);
  applyCardFilters();
}

function updateAssets(definitions = [], assetModels = getCurrentAssetModels()) {
  const normalizedModels = resolveAssetModels(definitions, assetModels);
  storeAssetCaches({ definitions, models: normalizedModels });

  const state = getState();
  clearAssetGroupUi();
  const { container: hub, totalInstances, emptyNotice } = buildAssetHub(
    normalizedModels.groups,
    normalizedModels.launchers,
    state
  );
  assetHubNode = hub;

  const container = resolveAssetGalleryContainer();
  if (container) {
    assetPortfolioNode = container;
  }

  if (assetPortfolioNode) {
    mountHub(assetPortfolioNode, hub);
  }

  assetEmptyNotice = emptyNotice || hub.querySelector('.venture-summary__empty') || null;
  updateAssetEmptyNotice(totalInstances);
  applyCardFilters();
}

function updateAssetHub() {
  const container = resolveAssetGalleryContainer();
  if (!container || !assetHubNode) return;
  if (container.firstElementChild) {
    container.replaceChild(assetHubNode, container.firstElementChild);
  } else {
    container.appendChild(assetHubNode);
  }
}

function updateAssetGroup(definitionId) {
  const group = getGroupForDefinition(definitionId);
  if (!group) return;

  const previousUi = getAssetGroupUi(group.id);
  const state = getState();
  const section = createAssetGroupSection(group, state);
  if (previousUi?.section && section) {
    previousUi.section.replaceWith(section);
  } else if (section && assetHubNode) {
    const portfolio = assetHubNode.querySelector('.asset-portfolio');
    portfolio?.appendChild(section);
  }

  const summaryData = buildAssetSummary(getCurrentAssetModels().groups);
  if (assetHubNode && summaryData?.summary) {
    const existing = assetHubNode.querySelector('.venture-summary');
    if (existing) {
      existing.replaceWith(summaryData.summary);
    } else {
      assetHubNode.prepend(summaryData.summary);
    }
    assetEmptyNotice = summaryData.emptyNotice || summaryData.summary.querySelector('.venture-summary__empty') || null;
    updateAssetEmptyNotice(summaryData.totalInstances);
  } else {
    updateAssetEmptyNotice(summaryData?.totalInstances ?? 0);
  }

  applyCardFilters();
}

const controller = {
  renderAssets,
  updateAssets
};

export default controller;

export {
  renderAssets,
  updateAssets,
  updateAssetGroup,
  updateAssetHub,
  updateAssetEmptyNotice,
  openInstanceDetails,
  openAssetGroupDetails,
  isAssetDefinition
};
