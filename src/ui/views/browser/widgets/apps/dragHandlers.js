function createDragHandlers({
  getList,
  getSortMode,
  canSort,
  onSwap
}) {
  let dragSourceId = null;

  function getListElement() {
    if (typeof getList === 'function') {
      try {
        return getList() || null;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function clearDragState() {
    dragSourceId = null;
    const list = getListElement();
    if (!list) return;
    list.querySelectorAll('.apps-widget__tile').forEach(tile => {
      tile.classList.remove('is-dragging');
      tile.classList.remove('is-drop-target');
    });
  }

  function handleDragStart(event) {
    if (!getSortMode?.()) {
      event.preventDefault?.();
      return;
    }
    const list = getListElement();
    if (!list) return;
    const tile = event.target?.closest?.('.apps-widget__tile');
    if (!tile || !list.contains(tile)) return;
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
    if (!getSortMode?.()) return;
    const list = getListElement();
    if (!list) return;
    const tile = event.target?.closest?.('.apps-widget__tile');
    if (!tile || !list.contains(tile)) return;
    const siteId = tile.dataset.siteTarget;
    if (!siteId || siteId === dragSourceId) return;
    tile.classList.add('is-drop-target');
  }

  function handleDragOver(event) {
    if (!getSortMode?.()) return;
    const list = getListElement();
    if (!list) return;
    const tile = event.target?.closest?.('.apps-widget__tile');
    if (!tile || !list.contains(tile)) return;
    const siteId = tile.dataset.siteTarget;
    if (!siteId || siteId === dragSourceId) return;
    event.preventDefault?.();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDragLeave(event) {
    if (!getSortMode?.()) return;
    const list = getListElement();
    if (!list) return;
    const tile = event.target?.closest?.('.apps-widget__tile');
    if (!tile || !list.contains(tile)) return;
    const siteId = tile.dataset.siteTarget;
    if (!siteId || siteId === dragSourceId) return;
    tile.classList.remove('is-drop-target');
  }

  function handleDrop(event) {
    if (!getSortMode?.()) return;
    const list = getListElement();
    if (!list) return;
    const tile = event.target?.closest?.('.apps-widget__tile');
    if (!tile || !list.contains(tile)) return;
    event.preventDefault?.();
    const targetId = tile.dataset.siteTarget;
    if (!targetId || targetId === dragSourceId) {
      clearDragState();
      return;
    }
    onSwap?.(dragSourceId, targetId);
    clearDragState();
  }

  function handleDragEnd() {
    clearDragState();
  }

  function updateDraggableState() {
    const list = getListElement();
    if (!list) return;
    const allowSort = Boolean(getSortMode?.()) && Boolean(canSort?.());
    list.querySelectorAll('.apps-widget__tile').forEach(tile => {
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

  return {
    clearDragState,
    handleDragStart,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    updateDraggableState
  };
}

export { createDragHandlers };
export default createDragHandlers;
