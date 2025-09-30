const views = new Map();
let activeViewId = null;

export function registerView(id, view) {
  if (!id || !view) return;
  views.set(id, view);
  if (!activeViewId) {
    activeViewId = id;
  }
}

export function setActiveView(id) {
  if (!views.has(id)) return;
  activeViewId = id;
  const view = views.get(id);
  if (typeof view?.activate === 'function') {
    view.activate();
  }
}

export function getActiveView() {
  if (activeViewId && views.has(activeViewId)) {
    return views.get(activeViewId);
  }
  const first = views.entries().next();
  if (!first.done) {
    const [id, view] = first.value;
    activeViewId = id;
    return view;
  }
  return null;
}

export function getRegisteredViews() {
  return Array.from(views.entries()).map(([id, view]) => ({ id, view }));
}
