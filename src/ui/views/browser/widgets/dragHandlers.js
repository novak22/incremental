function moveIdBeforeTarget(order, sourceId, targetId) {
  if (!Array.isArray(order)) {
    return [];
  }
  const filtered = order.filter(id => id && id !== sourceId);
  const targetIndex = filtered.indexOf(targetId);
  if (targetIndex < 0) {
    filtered.push(sourceId);
  } else {
    filtered.splice(targetIndex, 0, sourceId);
  }
  return filtered;
}

function createWidgetDragHandlers({
  getContainer,
  isModeActive,
  layoutManager,
  onOrderChange
} = {}) {
  let dragSourceId = null;

  const isActive = () => Boolean(isModeActive?.());

  const getContainerNode = () => (typeof getContainer === 'function' ? getContainer() : null);

  function clearDropTargets(container) {
    if (!container?.querySelectorAll) return;
    container.querySelectorAll('[data-widget]').forEach(node => {
      node.classList.remove('is-drop-target');
    });
  }

  function clearHandlePress(container) {
    if (!container?.querySelectorAll) return;
    container.querySelectorAll('[data-widget-handle]').forEach(handle => {
      handle.removeAttribute('aria-pressed');
    });
  }

  function clearDragState() {
    const container = getContainerNode();
    if (!container?.querySelectorAll) {
      dragSourceId = null;
      return;
    }
    container.querySelectorAll('[data-widget]').forEach(node => {
      node.classList.remove('is-dragging');
      node.classList.remove('is-drop-target');
      if (isActive()) {
        node.setAttribute('aria-grabbed', 'false');
      } else {
        node.removeAttribute('aria-grabbed');
      }
    });
    clearHandlePress(container);
    dragSourceId = null;
  }

  function reorderWidgets(sourceId, targetId) {
    if (!layoutManager || !sourceId || !targetId || sourceId === targetId) {
      return;
    }
    const currentOrder = layoutManager.getLayoutOrder?.();
    if (!Array.isArray(currentOrder) || !currentOrder.includes(sourceId) || !currentOrder.includes(targetId)) {
      return;
    }
    const nextOrder = moveIdBeforeTarget(currentOrder, sourceId, targetId);
    const persisted = layoutManager.setLayoutOrder?.(nextOrder);
    const resolved = Array.isArray(persisted) ? persisted : nextOrder;
    onOrderChange?.(resolved.slice());
  }

  function handleDragStart(event) {
    if (!isActive()) {
      event?.preventDefault?.();
      return;
    }
    const widget = event?.target?.closest?.('[data-widget]');
    const handle = widget?.querySelector?.('[data-widget-handle]');
    const container = getContainerNode();
    if (!handle || !widget || !container?.contains(widget)) {
      event?.preventDefault?.();
      return;
    }
    const widgetId = widget.dataset?.widget;
    if (!widgetId) {
      event?.preventDefault?.();
      return;
    }
    dragSourceId = widgetId;
    clearDropTargets(container);
    widget.classList.add('is-dragging');
    widget.setAttribute('aria-grabbed', 'true');
    handle.setAttribute('aria-pressed', 'true');
    if (event?.dataTransfer) {
      try {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', widgetId);
      } catch (error) {
        // Ignore data transfer issues in non-DOM environments.
      }
    }
  }

  function handleDragEnter(event) {
    if (!isActive()) return;
    const container = getContainerNode();
    const widget = event?.target?.closest?.('[data-widget]');
    if (!container || !widget || !container.contains(widget)) return;
    const widgetId = widget.dataset?.widget;
    if (!widgetId || widgetId === dragSourceId) return;
    widget.classList.add('is-drop-target');
  }

  function handleDragOver(event) {
    if (!isActive()) return;
    const container = getContainerNode();
    const widget = event?.target?.closest?.('[data-widget]');
    if (!container || !widget || !container.contains(widget)) return;
    const widgetId = widget.dataset?.widget;
    if (!widgetId || widgetId === dragSourceId) return;
    event?.preventDefault?.();
    if (event?.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleDragLeave(event) {
    if (!isActive()) return;
    const container = getContainerNode();
    const widget = event?.target?.closest?.('[data-widget]');
    if (!container || !widget || !container.contains(widget)) return;
    const widgetId = widget.dataset?.widget;
    if (!widgetId || widgetId === dragSourceId) return;
    widget.classList.remove('is-drop-target');
  }

  function handleDrop(event) {
    if (!isActive()) return;
    event?.preventDefault?.();
    const container = getContainerNode();
    const widget = event?.target?.closest?.('[data-widget]');
    if (!container || !widget || !container.contains(widget)) {
      clearDragState();
      return;
    }
    const targetId = widget.dataset?.widget;
    if (!targetId || targetId === dragSourceId) {
      clearDragState();
      return;
    }
    reorderWidgets(dragSourceId, targetId);
    clearDragState();
  }

  function handleDragEnd() {
    clearDragState();
  }

  function setActive(active) {
    const container = getContainerNode();
    if (!container?.querySelectorAll) {
      dragSourceId = null;
      return;
    }
    container.querySelectorAll('[data-widget]').forEach(node => {
      if (active) {
        node.setAttribute('draggable', 'true');
        node.setAttribute('aria-grabbed', 'false');
      } else {
        node.removeAttribute('draggable');
        node.removeAttribute('aria-grabbed');
        node.classList.remove('is-dragging');
        node.classList.remove('is-drop-target');
      }
    });
    if (!active) {
      clearHandlePress(container);
      dragSourceId = null;
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
    setActive
  };
}

export { createWidgetDragHandlers };
export default createWidgetDragHandlers;
