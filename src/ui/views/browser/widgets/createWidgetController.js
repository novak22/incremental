const noop = () => {};

function createWidgetController({
  prepareElements = elements => ({ ...elements }),
  onMount = noop,
  onRender = noop,
  onDestroy = noop
} = {}) {
  let elements = null;
  let mounted = false;
  const listeners = new Set();

  function createContext() {
    return {
      elements,
      addListener,
      removeListener,
      controller: api
    };
  }

  function removeListener(record) {
    if (!record) return;
    const { target, eventName, handler, options } = record;
    if (target?.removeEventListener && handler) {
      try {
        target.removeEventListener(eventName, handler, options);
      } catch (error) {
        // Ignore listener removal errors to avoid crashing teardown paths.
      }
    }
    listeners.delete(record);
  }

  function teardownListeners() {
    Array.from(listeners).forEach(removeListener);
  }

  function addListener(target, eventName, handler, options) {
    if (!target?.addEventListener || typeof handler !== 'function') {
      return noop;
    }
    const record = { target, eventName, handler, options };
    target.addEventListener(eventName, handler, options);
    listeners.add(record);
    return () => removeListener(record);
  }

  function mount(widgetElements = {}) {
    const prepared = typeof prepareElements === 'function'
      ? prepareElements(widgetElements || {})
      : ({ ...(widgetElements || {}) });

    if (mounted) {
      teardownListeners();
    }

    elements = prepared;
    mounted = true;
    onMount(createContext());
    return api;
  }

  function render(...args) {
    if (!mounted) {
      mount();
    }
    onRender(createContext(), ...args);
    return api;
  }

  function destroy() {
    if (!mounted) {
      elements = null;
      listeners.clear();
      return api;
    }

    teardownListeners();
    onDestroy(createContext());
    listeners.clear();
    elements = null;
    mounted = false;
    return api;
  }

  const api = {
    mount,
    init: mount,
    render,
    destroy,
    getElements: () => elements,
    isMounted: () => mounted,
    addListener,
    removeListener
  };

  return api;
}

export { createWidgetController };
export default createWidgetController;
