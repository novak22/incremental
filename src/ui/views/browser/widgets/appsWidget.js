import { SERVICE_PAGES } from '../config.js';
import {
  getLatestServiceSummaries,
  subscribeToServiceSummaries
} from '../cardsPresenter.js';

const STORAGE_KEY = 'browser.apps.order';
const DEFAULT_NOTE = 'Hover to preview each workspace, click to launch instantly.';
const EMPTY_NOTE = 'Unlock more workspaces through upgrades and courses.';
const SORT_NOTE = 'Sorting mode active — drag tiles to swap their spots.';

let elements = null;
let initialized = false;
let latestSummaries = [];
let customOrder = [];
let currentPages = [];
let sortMode = false;
let dragSourceId = null;

function ensureElements(widgetElements = {}) {
  if (elements) return;
  elements = widgetElements;
  elements?.sortToggle?.addEventListener('click', handleSortToggle);
  if (elements?.list) {
    elements.list.addEventListener('click', handleListClick, { capture: true });
    elements.list.addEventListener('dragstart', handleDragStart);
    elements.list.addEventListener('dragenter', handleDragEnter);
    elements.list.addEventListener('dragover', handleDragOver);
    elements.list.addEventListener('dragleave', handleDragLeave);
    elements.list.addEventListener('drop', handleDrop);
    elements.list.addEventListener('dragend', handleDragEnd);
  }
}

function getSummaryMap() {
  return new Map(latestSummaries.map(entry => [entry?.id, entry]));
}

function isPageLocked(meta = '') {
  return /lock/i.test(meta || '');
}

function describeTooltip(page, summary) {
  const parts = [];
  if (page?.tagline) {
    parts.push(page.tagline);
  }
  if (summary?.meta) {
    parts.push(summary.meta);
  }
  return parts.join(' — ');
}

function describeAriaLabel(page, summary) {
  const parts = [page?.label || 'Workspace'];
  if (page?.tagline) {
    parts.push(page.tagline);
  }
  if (summary?.meta) {
    parts.push(summary.meta);
  }
  return parts.join('. ');
}

function renderEmptyState() {
  if (!elements?.list) return;
  elements.list.innerHTML = '';
  const empty = document.createElement('li');
  empty.className = 'apps-widget__empty';
  empty.textContent = 'Unlock more apps to populate this list.';
  elements.list.appendChild(empty);
  if (elements?.note) {
    elements.note.textContent = EMPTY_NOTE;
  }
}

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage || null;
  } catch (error) {
    return null;
  }
}

function loadSortOrder() {
  const storage = getStorage();
  if (!storage) return;
  try {
    const stored = JSON.parse(storage.getItem(STORAGE_KEY));
    if (Array.isArray(stored)) {
      customOrder = stored.filter(id => typeof id === 'string' && id);
    }
  } catch (error) {
    customOrder = [];
  }
}

function persistSortOrder(order = customOrder) {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (Array.isArray(order) && order.length) {
      storage.setItem(STORAGE_KEY, JSON.stringify(order));
    } else {
      storage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    // Ignore persistence errors to keep the widget responsive.
  }
}

function getOrderedIds(availableIds = []) {
  const uniqueIds = Array.from(new Set(availableIds.filter(Boolean)));
  if (!uniqueIds.length) return [];
  const stored = Array.isArray(customOrder) ? customOrder : [];
  const filtered = stored.filter(id => uniqueIds.includes(id));
  const missing = uniqueIds.filter(id => !filtered.includes(id));
  return [...filtered, ...missing];
}

function getOrderedPages(pages = []) {
  const map = new Map();
  pages.forEach(page => {
    if (page?.id) {
      map.set(page.id, page);
    }
  });
  const orderedIds = getOrderedIds(pages.map(page => page?.id));
  return orderedIds.map(id => map.get(id)).filter(Boolean);
}

function canSort() {
  return currentPages.length > 1;
}

function clearDragState() {
  dragSourceId = null;
  if (!elements?.list) return;
  elements.list.querySelectorAll('.apps-widget__tile').forEach(tile => {
    tile.classList.remove('is-dragging');
    tile.classList.remove('is-drop-target');
  });
}

function updateDraggableState() {
  if (!elements?.list) return;
  const allowSort = sortMode && canSort();
  elements.list.querySelectorAll('.apps-widget__tile').forEach(tile => {
    tile.draggable = allowSort;
    if (allowSort) {
      tile.setAttribute('aria-disabled', 'true');
    } else {
      tile.removeAttribute('aria-disabled');
    }
  });
  if (!allowSort) {
    clearDragState();
  }
}

function updateSortModeUI() {
  const hasPages = currentPages.length > 0;
  const allowSort = hasPages && canSort();
  if (!allowSort && sortMode) {
    sortMode = false;
  }

  if (elements?.sortToggle) {
    elements.sortToggle.disabled = !allowSort;
    elements.sortToggle.setAttribute('aria-pressed', String(sortMode && allowSort));
    elements.sortToggle.textContent = sortMode && allowSort ? 'Done' : 'Arrange';
    elements.sortToggle.title = sortMode && allowSort
      ? 'Finish arranging your apps'
      : 'Arrange the apps';
  }

  if (elements?.container) {
    elements.container.classList.toggle('is-sorting', sortMode && allowSort);
  }

  if (elements?.note) {
    if (!hasPages) {
      elements.note.textContent = EMPTY_NOTE;
    } else if (sortMode && allowSort) {
      elements.note.textContent = SORT_NOTE;
    } else {
      elements.note.textContent = DEFAULT_NOTE;
    }
  }

  updateDraggableState();
}

function setSortMode(active) {
  const allowSort = canSort();
  const nextState = active && allowSort;
  if (sortMode === nextState) {
    updateSortModeUI();
    return;
  }
  sortMode = nextState;
  if (!sortMode) {
    clearDragState();
  }
  updateSortModeUI();
}

function handleSortToggle() {
  setSortMode(!sortMode);
}

function handleListClick(event) {
  if (!sortMode || !elements?.list) return;
  const button = event.target.closest('button[data-site-target]');
  if (!button || !elements.list.contains(button)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function handleDragStart(event) {
  if (!sortMode) {
    event.preventDefault();
    return;
  }
  const tile = event.target.closest('.apps-widget__tile');
  if (!tile || !elements?.list?.contains(tile)) return;
  const siteId = tile.dataset.siteTarget;
  if (!siteId) return;
  dragSourceId = siteId;
  tile.classList.add('is-dragging');
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', siteId);
  }
}

function handleDragEnter(event) {
  if (!sortMode) return;
  const tile = event.target.closest('.apps-widget__tile');
  if (!tile || !elements?.list?.contains(tile)) return;
  const siteId = tile.dataset.siteTarget;
  if (!siteId || siteId === dragSourceId) return;
  tile.classList.add('is-drop-target');
}

function handleDragOver(event) {
  if (!sortMode) return;
  const tile = event.target.closest('.apps-widget__tile');
  if (!tile || !elements?.list?.contains(tile)) return;
  const siteId = tile.dataset.siteTarget;
  if (!siteId || siteId === dragSourceId) return;
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function handleDragLeave(event) {
  if (!sortMode) return;
  const tile = event.target.closest('.apps-widget__tile');
  if (!tile || !elements?.list?.contains(tile)) return;
  const siteId = tile.dataset.siteTarget;
  if (!siteId || siteId === dragSourceId) return;
  tile.classList.remove('is-drop-target');
}

function swapOrder(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const availableIds = getOrderedIds(currentPages.map(page => page?.id));
  const sourceIndex = availableIds.indexOf(sourceId);
  const targetIndex = availableIds.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const nextOrder = availableIds.slice();
  nextOrder[sourceIndex] = targetId;
  nextOrder[targetIndex] = sourceId;
  customOrder = nextOrder;
  persistSortOrder(customOrder);
  renderList();
}

function handleDrop(event) {
  if (!sortMode) return;
  const tile = event.target.closest('.apps-widget__tile');
  if (!tile || !elements?.list?.contains(tile)) return;
  event.preventDefault();
  const targetId = tile.dataset.siteTarget;
  if (!targetId || targetId === dragSourceId) {
    clearDragState();
    return;
  }
  swapOrder(dragSourceId, targetId);
}

function handleDragEnd() {
  clearDragState();
}

function renderList() {
  if (!elements?.list) return;
  const summaryMap = getSummaryMap();
  const pages = SERVICE_PAGES.filter(page => !isPageLocked(summaryMap.get(page.id)?.meta));

  elements.list.innerHTML = '';
  clearDragState();
  currentPages = [];

  if (!pages.length) {
    renderEmptyState();
    updateSortModeUI();
    return;
  }

  const orderedPages = getOrderedPages(pages);
  currentPages = orderedPages;
  const previousOrder = Array.isArray(customOrder) ? customOrder : [];
  const nextOrder = orderedPages.map(page => page?.id).filter(Boolean);
  const orderChanged =
    nextOrder.length !== previousOrder.length
    || nextOrder.some((id, index) => id !== previousOrder[index]);
  customOrder = nextOrder;
  if (orderChanged) {
    persistSortOrder(customOrder);
  }

  orderedPages.forEach(page => {
    const summary = summaryMap.get(page.id);
    const item = document.createElement('li');
    item.className = 'apps-widget__item';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'apps-widget__tile';
    button.dataset.siteTarget = page.id;
    const tooltip = describeTooltip(page, summary);
    if (tooltip) {
      button.title = tooltip;
    }
    button.setAttribute('aria-label', describeAriaLabel(page, summary));
    button.setAttribute('aria-pressed', 'false');

    const icon = document.createElement('span');
    icon.className = 'apps-widget__icon';
    icon.textContent = page.icon || '✨';

    const label = document.createElement('span');
    label.className = 'apps-widget__label';

    const name = document.createElement('span');
    name.className = 'apps-widget__name';
    name.textContent = page.label;

    label.appendChild(name);

    button.append(icon, label);
    item.appendChild(button);
    elements.list.appendChild(item);
  });

  updateSortModeUI();
}

function handleServiceSummaries(summaries = []) {
  latestSummaries = Array.isArray(summaries) ? summaries.filter(entry => entry?.id) : [];
  renderList();
}

function init(widgetElements = {}) {
  if (initialized) return;
  ensureElements(widgetElements);
  loadSortOrder();
  initialized = true;
  subscribeToServiceSummaries(handleServiceSummaries);
  handleServiceSummaries(getLatestServiceSummaries());
}

function render() {
  renderList();
}

export default {
  init,
  render
};
