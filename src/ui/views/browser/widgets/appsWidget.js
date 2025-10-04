import { SERVICE_PAGES } from '../config.js';
import {
  getLatestServiceSummaries,
  subscribeToServiceSummaries
} from '../cardsPresenter.js';
import {
  loadSortOrder,
  persistSortOrder,
  getOrderedIds,
  getOrderedPages,
  getSummaryMap,
  isPageLocked,
  renderEmptyState,
  createTileElement,
  createDragHandlers
} from './apps/index.js';

const DEFAULT_NOTE = 'Hover to preview each workspace, click to launch instantly.';
const EMPTY_NOTE = 'Unlock more workspaces through upgrades and courses.';
const SORT_NOTE = 'Sorting mode active — drag tiles to swap their spots.';

let elements = null;
let initialized = false;
let latestSummaries = [];
let customOrder = [];
let currentPages = [];
let sortMode = false;
let dragHandlers = null;

function canSort() {
  return currentPages.length > 1;
}

function ensureDragHandlers() {
  if (dragHandlers) return dragHandlers;
  dragHandlers = createDragHandlers({
    elementsRef: () => elements,
    getSortMode: () => sortMode,
    canSort,
    onSwap: swapOrder
  });
  return dragHandlers;
}

function ensureElements(widgetElements = {}) {
  if (elements) return;
  elements = widgetElements;
  const handlers = ensureDragHandlers();
  elements?.sortToggle?.addEventListener('click', handleSortToggle);
  if (elements?.list) {
    elements.list.addEventListener('click', handleListClick, { capture: true });
    elements.list.addEventListener('dragstart', handlers.handleDragStart);
    elements.list.addEventListener('dragenter', handlers.handleDragEnter);
    elements.list.addEventListener('dragover', handlers.handleDragOver);
    elements.list.addEventListener('dragleave', handlers.handleDragLeave);
    elements.list.addEventListener('drop', handlers.handleDrop);
    elements.list.addEventListener('dragend', handlers.handleDragEnd);
  }
}

function clearDragState() {
  ensureDragHandlers().clearDragState();
}

function updateDraggableState() {
  ensureDragHandlers().updateDraggableState();
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

function swapOrder(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const availableIds = getOrderedIds(
    currentPages.map(page => page?.id),
    customOrder
  );
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

function renderList() {
  if (!elements?.list) return;
  const summaryMap = getSummaryMap(latestSummaries);
  const pages = SERVICE_PAGES.filter(
    page => !isPageLocked(summaryMap.get(page.id)?.meta)
  );

  elements.list.innerHTML = '';
  clearDragState();
  currentPages = [];

  if (!pages.length) {
    renderEmptyState({
      listElement: elements.list,
      emptyText: 'Unlock more apps to populate this list.',
      noteElement: elements?.note,
      noteText: EMPTY_NOTE
    });
    updateSortModeUI();
    return;
  }

  const orderedPages = getOrderedPages(pages, customOrder);
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
    const item = createTileElement(page, summary);
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
  customOrder = loadSortOrder();
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
