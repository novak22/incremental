import { getElement } from '../../elements/registry.js';

function debounce(fn, wait = 120) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

function emitEvent(name) {
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

function initializeHustleControls(onChange, preferences = {}) {
  const controls = getElement('hustleControls') || {};
  const { hustleAvailableToggle, hustleSort, hustleSearch } = controls;
  if (hustleAvailableToggle) {
    hustleAvailableToggle.checked = Boolean(preferences.availableOnly);
    hustleAvailableToggle.addEventListener('change', () => {
      onChange('hustles', { availableOnly: hustleAvailableToggle.checked });
    });
  }
  if (hustleSort) {
    hustleSort.value = preferences.sort || hustleSort.value;
    hustleSort.addEventListener('change', () => {
      onChange('hustles', { sort: hustleSort.value });
    });
  }
  if (hustleSearch) {
    hustleSearch.value = preferences.query || '';
    const handler = debounce(() => {
      onChange('hustles', { query: hustleSearch.value });
    }, 140);
    hustleSearch.addEventListener('input', handler);
  }
}

function initializeAssetControls(onChange, preferences = {}) {
  const filters = getElement('assetFilters') || {};
  if (filters.activeOnly) {
    filters.activeOnly.checked = Boolean(preferences.activeOnly);
    filters.activeOnly.addEventListener('change', () => {
      onChange('assets', { activeOnly: filters.activeOnly.checked });
    });
  }
  if (filters.maintenance) {
    filters.maintenance.checked = Boolean(preferences.maintenanceOnly);
    filters.maintenance.addEventListener('change', () => {
      onChange('assets', { maintenanceOnly: filters.maintenance.checked });
    });
  }
  if (filters.lowRisk) {
    filters.lowRisk.checked = Boolean(preferences.hideHighRisk);
    filters.lowRisk.addEventListener('change', () => {
      onChange('assets', { hideHighRisk: filters.lowRisk.checked });
    });
  }
}

function initializeUpgradeControls(onChange, preferences = {}) {
  const filters = getElement('upgradeFilters') || {};
  if (filters.unlocked) {
    filters.unlocked.checked = preferences.readyOnly !== false;
    filters.unlocked.addEventListener('change', () => {
      onChange('upgrades', { readyOnly: filters.unlocked.checked });
    });
  }
}

function initializeStudyControls(onChange, preferences = {}) {
  const filters = getElement('studyFilters') || {};
  if (filters.activeOnly) {
    filters.activeOnly.checked = Boolean(preferences.activeOnly);
    filters.activeOnly.addEventListener('change', () => {
      onChange('study', { activeOnly: filters.activeOnly.checked });
    });
  }
  if (filters.hideComplete) {
    filters.hideComplete.checked = Boolean(preferences.hideComplete);
    filters.hideComplete.addEventListener('change', () => {
      onChange('study', { hideComplete: filters.hideComplete.checked });
    });
  }
}

function renderHustleFilters(model) {
  const controls = getElement('hustleControls') || {};
  const list = controls.hustleList;
  if (!list) return;
  const cards = Array.from(list.querySelectorAll('[data-hustle]'));
  const cardMap = new Map(cards.map(card => [card.dataset.hustle, card]));
  const fragment = document.createDocumentFragment();
  const orderedIds = Array.isArray(model?.orderedIds) ? model.orderedIds : [];
  const hiddenSet = new Set(Array.isArray(model?.hiddenIds) ? model.hiddenIds : []);

  orderedIds.forEach(id => {
    const card = cardMap.get(id);
    if (!card) return;
    card.hidden = hiddenSet.has(id);
    fragment.appendChild(card);
    cardMap.delete(id);
    hiddenSet.delete(id);
  });

  cardMap.forEach((card, id) => {
    const hidden = hiddenSet.has(id);
    card.hidden = hidden;
    fragment.appendChild(card);
    hiddenSet.delete(id);
  });

  list.appendChild(fragment);
}

function renderAssetFilters(model) {
  const gallery = getElement('assetGallery');
  if (!gallery) return;
  const hiddenSet = new Set(Array.isArray(model?.hiddenIds) ? model.hiddenIds : []);
  const visibleSet = new Set(Array.isArray(model?.visibleIds) ? model.visibleIds : []);
  const items = Array.from(gallery.querySelectorAll('[data-asset]'));
  items.forEach(item => {
    const id = item.dataset.asset;
    if (!id) return;
    if (hiddenSet.has(id)) {
      item.hidden = true;
    } else if (visibleSet.size === 0 || visibleSet.has(id)) {
      item.hidden = false;
    }
  });
}

function renderUpgradeFilters(model) {
  const list = getElement('upgradeList');
  if (!list) return;
  const hiddenSet = new Set(Array.isArray(model?.hiddenIds) ? model.hiddenIds : []);
  const visibleSet = new Set(Array.isArray(model?.visibleIds) ? model.visibleIds : []);
  const cards = Array.from(list.querySelectorAll('[data-upgrade]'));
  cards.forEach(card => {
    const id = card.dataset.upgrade;
    if (!id) return;
    if (hiddenSet.has(id)) {
      card.hidden = true;
    } else if (visibleSet.size === 0 || visibleSet.has(id)) {
      card.hidden = false;
    }
  });
  emitEvent('upgrades:filtered');
}

function renderStudyFilters(model) {
  const list = getElement('studyTrackList');
  if (!list) return;
  const hiddenSet = new Set(Array.isArray(model?.hiddenIds) ? model.hiddenIds : []);
  const visibleSet = new Set(Array.isArray(model?.visibleIds) ? model.visibleIds : []);
  const tracks = Array.from(list.querySelectorAll('[data-track]'));
  tracks.forEach(track => {
    const id = track.dataset.track;
    if (!id) return;
    if (hiddenSet.has(id)) {
      track.hidden = true;
    } else if (visibleSet.size === 0 || visibleSet.has(id)) {
      track.hidden = false;
    }
  });
}

function initControls({ onChange, getPreferences } = {}) {
  const preferences = typeof getPreferences === 'function' ? getPreferences() : {};
  const changeHandler = typeof onChange === 'function' ? onChange : () => {};
  initializeHustleControls(changeHandler, preferences?.hustles);
  initializeAssetControls(changeHandler, preferences?.assets);
  initializeUpgradeControls(changeHandler, preferences?.upgrades);
  initializeStudyControls(changeHandler, preferences?.study);
}

function applyFilters(model) {
  if (!model) return;
  renderHustleFilters(model.hustles);
  renderAssetFilters(model.assets);
  renderUpgradeFilters(model.upgrades);
  renderStudyFilters(model.study);
}

const layoutPresenter = {
  initControls,
  applyFilters
};

export default layoutPresenter;
