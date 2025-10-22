import { SERVICE_PAGES } from '../config.js';
import {
  getLatestServiceSummaries,
  subscribeToServiceSummaries
} from '../apps/serviceManager.js';
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
import { createWidgetController } from './createWidgetController.js';

function prepareElements(widgetElements = {}) {
  const elements = { ...widgetElements };
  const { container } = elements;

  if (!elements.list && container?.querySelector) {
    elements.list = container.querySelector('[data-role="browser-app-launcher"], .apps-widget__list');
  }

  if (!elements.note && container?.querySelector) {
    elements.note = container.querySelector('#browser-widget-apps-note, .apps-widget__intro p');
  }

  if (!elements.sortToggle && container?.querySelector) {
    elements.sortToggle = container.querySelector('#browser-widget-apps-sort-toggle, .apps-widget__sort-toggle');
  }

  return elements;
}

const DEFAULT_NOTE = 'Hover to preview each workspace, click to launch instantly.';
const EMPTY_NOTE = 'Unlock more workspaces through upgrades and courses.';
const SORT_NOTE = 'Sorting mode active — drag tiles to swap their spots.';

export function createAppsWidgetController() {
  let latestSummaries = [];
  let customOrder = [];
  let currentPages = [];
  let sortMode = false;
  let dragHandlers = null;
  let unsubscribeSummaries = null;

  const controller = createWidgetController({
    prepareElements,
    onMount({ elements, addListener, controller: api }) {
      dragHandlers = createDragHandlers({
        getList: () => api.getElements()?.list || null,
        getSortMode: () => sortMode,
        canSort,
        onSwap: swapOrder
      });

      customOrder = loadSortOrder();

      if (elements?.sortToggle) {
        addListener(elements.sortToggle, 'click', handleSortToggle);
      }

      if (elements?.list && dragHandlers) {
        const { list } = elements;
        addListener(list, 'click', handleListClick, { capture: true });
        addListener(list, 'dragstart', dragHandlers.handleDragStart);
        addListener(list, 'dragenter', dragHandlers.handleDragEnter);
        addListener(list, 'dragover', dragHandlers.handleDragOver);
        addListener(list, 'dragleave', dragHandlers.handleDragLeave);
        addListener(list, 'drop', dragHandlers.handleDrop);
        addListener(list, 'dragend', dragHandlers.handleDragEnd);
      }

      if (typeof unsubscribeSummaries === 'function') {
        unsubscribeSummaries();
      }
      unsubscribeSummaries = subscribeToServiceSummaries(handleServiceSummaries);
      handleServiceSummaries(getLatestServiceSummaries());
    },
    onRender() {
      renderList();
    },
    onDestroy({ controller: api }) {
      if (dragHandlers) {
        dragHandlers.clearDragState();
        dragHandlers = null;
      }
      if (typeof unsubscribeSummaries === 'function') {
        unsubscribeSummaries();
        unsubscribeSummaries = null;
      }
      latestSummaries = [];
      currentPages = [];
      sortMode = false;
      const elements = api.getElements() || {};
      if (elements.list) {
        elements.list.innerHTML = '';
      }
      if (elements.container) {
        elements.container.classList.remove('is-sorting');
      }
      if (elements.sortToggle) {
        elements.sortToggle.disabled = true;
        elements.sortToggle.setAttribute('aria-pressed', 'false');
        elements.sortToggle.textContent = 'Arrange';
        elements.sortToggle.title = 'Arrange the apps';
      }
      if (elements.note) {
        elements.note.textContent = EMPTY_NOTE;
      }
    }
  });

  function canSort() {
    return currentPages.length > 1;
  }

  function clearDragState() {
    dragHandlers?.clearDragState();
  }

  function updateDraggableState() {
    dragHandlers?.updateDraggableState();
  }

  function getElements() {
    return controller.getElements() || {};
  }

  function updateSortModeUI() {
    const elements = getElements();
    const hasPages = currentPages.length > 0;
    const allowSort = hasPages && canSort();
    if (!allowSort && sortMode) {
      sortMode = false;
    }

    if (elements.sortToggle) {
      elements.sortToggle.disabled = !allowSort;
      elements.sortToggle.setAttribute('aria-pressed', String(sortMode && allowSort));
      elements.sortToggle.textContent = sortMode && allowSort ? 'Done' : 'Arrange';
      elements.sortToggle.title = sortMode && allowSort
        ? 'Finish arranging your apps'
        : 'Arrange the apps';
    }

    if (elements.container) {
      elements.container.classList.toggle('is-sorting', sortMode && allowSort);
    }

    if (elements.note) {
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
    if (!sortMode) return;
    const elements = getElements();
    const list = elements.list;
    if (!list) return;
    const button = event.target?.closest?.('button[data-site-target]');
    if (!button || !list.contains(button)) return;
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
    const elements = getElements();
    if (!elements.list) return;
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
        noteElement: elements.note,
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

  return {
    ...controller,
    init: controller.mount,
    render: (...args) => controller.render(...args),
    destroy: controller.destroy,
    setSortMode
  };
}

const appsWidget = createAppsWidgetController();

export default appsWidget;
