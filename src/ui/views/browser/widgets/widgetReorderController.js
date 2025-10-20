import { getElement } from '../../../elements/registry.js';
import layoutManagerFallback from './layoutManager.js';
import createWidgetDragHandlers from './dragHandlers.js';

function resolveLayoutManager() {
  const record = getElement('homepageWidgets');
  if (record?.layoutManager) {
    return record.layoutManager;
  }
  return layoutManagerFallback;
}

function resolveContainer() {
  const record = getElement('homepageWidgets');
  return record?.container || null;
}

function isElement(node) {
  return Boolean(node && typeof node === 'object' && node.nodeType === 1);
}

function ensureToggle(container) {
  const tabsRecord = getElement('browserTabs') || {};
  let host = tabsRecord.sidebar || tabsRecord.container?.querySelector?.('[data-role="browser-tabs-sidebar"]');
  let existing = tabsRecord.reorderToggle;
  if (!isElement(existing) && host?.querySelector) {
    existing = host.querySelector('[data-role="widget-reorder-toggle"]');
  }
  if (isElement(existing)) {
    tabsRecord.reorderToggle = existing;
    if (isElement(host)) {
      tabsRecord.sidebar = host;
    }
    return existing;
  }

  const ownerDocument =
    (isElement(host) ? host.ownerDocument : null) ||
    (isElement(tabsRecord.container) ? tabsRecord.container.ownerDocument : null) ||
    container?.ownerDocument ||
    (typeof document !== 'undefined' ? document : null);
  if (!ownerDocument) {
    return null;
  }

  if (!host && isElement(tabsRecord.container)) {
    host = ownerDocument.createElement('div');
    host.className = 'browser-tabs__sidebar';
    host.setAttribute('data-role', 'browser-tabs-sidebar');
    tabsRecord.container.appendChild(host);
  }

  if (!isElement(host)) {
    return null;
  }

  const button = ownerDocument.createElement('button');
  button.type = 'button';
  button.className = 'browser-home__reorder-toggle browser-button browser-button--text';
  button.setAttribute('data-role', 'widget-reorder-toggle');
  button.setAttribute('aria-pressed', 'false');
  button.title = 'Shuffle the home widgets to suit your flow';
  button.textContent = 'Reorder widgets';
  host.appendChild(button);

  tabsRecord.sidebar = host;
  tabsRecord.reorderToggle = button;

  return button;
}

function getWidgetLabel(widget) {
  if (!widget) {
    return 'home';
  }
  const titleText = widget.querySelector('.browser-widget__title-text');
  if (titleText?.textContent) {
    return titleText.textContent.trim();
  }
  const heading = widget.querySelector('.browser-widget__title');
  if (heading?.textContent) {
    return heading.textContent.trim();
  }
  return widget.dataset?.widget || 'widget';
}

function createWidgetReorderController({
  layoutResolver = resolveLayoutManager,
  containerResolver = resolveContainer
} = {}) {
  let container = null;
  let layoutManager = null;
  let toggle = null;
  let dragHandlers = null;
  let isActive = false;
  const teardown = [];

  function getOrder() {
    const order = layoutManager?.getLayoutOrder?.();
    return Array.isArray(order) ? order.slice() : [];
  }

  function addListener(target, type, handler, options) {
    if (!target?.addEventListener || typeof handler !== 'function') {
      return;
    }
    target.addEventListener(type, handler, options);
    teardown.push(() => {
      target.removeEventListener(type, handler, options);
    });
  }

  function updateToggleState(order = getOrder()) {
    if (!toggle) return;
    const allow = order.length > 1;
    toggle.disabled = !allow;
    const pressed = isActive && allow;
    toggle.setAttribute('aria-pressed', String(pressed));
    toggle.textContent = pressed ? 'Done arranging' : 'Reorder widgets';
    toggle.title = pressed
      ? 'Lock in your widget lineup'
      : 'Shuffle the home widgets to suit your flow';
  }

  function syncHandles(order = getOrder()) {
    if (!container?.querySelectorAll) return;
    const total = order.length;
    container.querySelectorAll('[data-widget-handle]').forEach(handle => {
      const widget = handle.closest?.('[data-widget]');
      const widgetId = widget?.dataset?.widget;
      const label = getWidgetLabel(widget);
      handle.dataset.widgetLabel = label;
      const position = widgetId ? order.indexOf(widgetId) + 1 : 0;
      if (isActive && total > 1) {
        handle.removeAttribute('aria-hidden');
        handle.tabIndex = 0;
        handle.setAttribute(
          'aria-label',
          position > 0
            ? `Move ${label} widget. Position ${position} of ${total}. Use arrow keys to reorder.`
            : `Move ${label} widget. Use arrow keys to reorder.`
        );
      } else {
        handle.setAttribute('aria-hidden', 'true');
        handle.tabIndex = -1;
        handle.setAttribute('aria-label', `Reorder ${label} widget`);
      }
    });
  }

  function applyMode(nextActive, { suppressSync = false } = {}) {
    const order = getOrder();
    const allow = order.length > 1;
    const desired = nextActive && allow;
    if (isActive === desired) {
      if (!suppressSync) {
        updateToggleState(order);
        syncHandles(order);
      }
      return;
    }
    isActive = desired;
    if (container) {
      container.classList.toggle('browser-home__widgets--reordering', isActive);
    }
    dragHandlers?.setActive?.(isActive);
    if (!isActive) {
      dragHandlers?.clearDragState?.();
      if (container?.querySelectorAll) {
        container.querySelectorAll('[data-widget]').forEach(widget => {
          widget.removeAttribute('aria-grabbed');
        });
      }
    }
    if (!suppressSync) {
      updateToggleState(order);
      syncHandles(order);
    }
  }

  function handleOrderChange(order = getOrder()) {
    if (isActive && order.length <= 1) {
      applyMode(false, { suppressSync: true });
    }
    updateToggleState(order);
    syncHandles(order);
  }

  function focusHandle(widgetId) {
    if (!container) return;
    const performFocus = () => {
      const widget = container.querySelector?.(`[data-widget="${widgetId}"]`);
      const handle = widget?.querySelector?.('[data-widget-handle]');
      if (handle && isActive) {
        handle.focus({ preventScroll: false });
      }
    };
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => performFocus());
    } else {
      setTimeout(performFocus, 0);
    }
  }

  function moveWidgetToIndex(widgetId, targetIndex) {
    const order = getOrder();
    const currentIndex = order.indexOf(widgetId);
    if (currentIndex < 0 || targetIndex === currentIndex || targetIndex < 0 || targetIndex >= order.length) {
      return;
    }
    const nextOrder = order.slice();
    const [entry] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(targetIndex, 0, entry);
    const persisted = layoutManager?.setLayoutOrder?.(nextOrder);
    const resolved = Array.isArray(persisted) ? persisted : nextOrder;
    handleOrderChange(resolved);
    focusHandle(widgetId);
  }

  function handleToggle(event) {
    event?.preventDefault?.();
    applyMode(!isActive);
  }

  function handleVisibilityChange(event) {
    const detail = event?.detail;
    if (!detail || typeof detail.visible !== 'boolean') {
      return;
    }
    const visible = Boolean(detail.visible);
    if (!visible) {
      applyMode(false);
    }
    if (toggle) {
      toggle.tabIndex = visible ? 0 : -1;
    }
  }

  function handleKeyDown(event) {
    if (!isActive || !container) return;
    const handle = event?.target?.closest?.('[data-widget-handle]');
    if (!handle || !container.contains(handle)) return;
    const widget = handle.closest?.('[data-widget]');
    const widgetId = widget?.dataset?.widget;
    if (!widgetId) return;
    const order = getOrder();
    const currentIndex = order.indexOf(widgetId);
    if (currentIndex < 0) return;

    let targetIndex = currentIndex;
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        targetIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        targetIndex = Math.min(order.length - 1, currentIndex + 1);
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = order.length - 1;
        break;
      default:
        return;
    }

    if (targetIndex === currentIndex) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    moveWidgetToIndex(widgetId, targetIndex);
  }

  function init() {
    if (container || toggle || dragHandlers || teardown.length) {
      destroy();
    }

    container = containerResolver?.() || null;
    layoutManager = layoutResolver?.() || null;
    if (!container || !layoutManager) {
      return false;
    }
    toggle = ensureToggle(container);
    if (!toggle) {
      return false;
    }

    dragHandlers = createWidgetDragHandlers({
      getContainer: () => container,
      isModeActive: () => isActive,
      layoutManager,
      onOrderChange: handleOrderChange
    });

    addListener(toggle, 'click', handleToggle);
    addListener(toggle, 'browser:reorder-visibility', handleVisibilityChange);
    addListener(container, 'dragstart', dragHandlers.handleDragStart);
    addListener(container, 'dragenter', dragHandlers.handleDragEnter);
    addListener(container, 'dragover', dragHandlers.handleDragOver);
    addListener(container, 'dragleave', dragHandlers.handleDragLeave);
    addListener(container, 'drop', dragHandlers.handleDrop);
    addListener(container, 'dragend', dragHandlers.handleDragEnd);
    addListener(container, 'keydown', handleKeyDown, true);

    applyMode(false, { suppressSync: true });
    handleOrderChange(getOrder());

    return true;
  }

  function destroy() {
    while (teardown.length) {
      const fn = teardown.pop();
      try {
        fn?.();
      } catch (error) {
        // Ignore teardown errors.
      }
    }
    dragHandlers?.clearDragState?.();
    container?.classList?.remove('browser-home__widgets--reordering');
    if (container?.querySelectorAll) {
      container.querySelectorAll('[data-widget-handle]').forEach(handle => {
        handle.setAttribute('aria-hidden', 'true');
        handle.tabIndex = -1;
      });
    }
    container = null;
    layoutManager = null;
    toggle = null;
    dragHandlers = null;
    isActive = false;
  }

  return {
    init,
    destroy,
    refresh: handleOrderChange,
    setReorderMode: applyMode,
    __testables: {
      applyMode,
      handleOrderChange,
      moveWidgetToIndex
    }
  };
}

export { createWidgetReorderController };
export default createWidgetReorderController;
