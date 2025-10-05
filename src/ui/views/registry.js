import browserView from './browser/index.js';
import developerView from './developer/index.js';

const registeredViews = [];

function normalizeId(id) {
  return typeof id === 'string' ? id.trim().toLowerCase() : null;
}

function ensureGuardFn(guard) {
  if (typeof guard === 'function') {
    return guard;
  }
  return () => true;
}

export function registerView(view, { guard } = {}) {
  if (!view || !view.id) {
    throw new Error('Cannot register a view without an id.');
  }

  const id = normalizeId(view.id);
  const entry = {
    id,
    view,
    guard: ensureGuardFn(guard),
    presenters: view.presenters ?? {}
  };

  const existingIndex = registeredViews.findIndex(item => item.id === id);
  if (existingIndex >= 0) {
    registeredViews.splice(existingIndex, 1, entry);
  } else {
    registeredViews.push(entry);
  }

  return entry;
}

export function unregisterView(id) {
  const normalizedId = normalizeId(id);
  if (!normalizedId) {
    return null;
  }

  const index = registeredViews.findIndex(item => item.id === normalizedId);
  if (index === -1) {
    return null;
  }

  const [removed] = registeredViews.splice(index, 1);
  return removed;
}

export function getRegisteredViews() {
  return registeredViews.map(entry => ({ ...entry }));
}

function findEntryById(id) {
  const normalizedId = normalizeId(id);
  if (!normalizedId) {
    return null;
  }

  return registeredViews.find(entry => entry.id === normalizedId) ?? null;
}

function canActivate(entry, rootDocument) {
  try {
    return !entry?.guard || entry.guard(rootDocument);
  } catch (error) {
    return false;
  }
}

function resolveViewFromFlag(rootDocument) {
  if (typeof window === 'undefined' || typeof URLSearchParams !== 'function') {
    return null;
  }

  let requestedId = null;
  try {
    const params = new URLSearchParams(window.location.search);
    requestedId = params.get('ui') || params.get('view') || params.get('shell');
  } catch (error) {
    requestedId = null;
  }

  if (!requestedId) {
    return null;
  }

  const entry = findEntryById(requestedId);
  if (entry && canActivate(entry, rootDocument)) {
    return entry.view;
  }

  return null;
}

export function resolveInitialView(
  rootDocument = typeof document !== 'undefined' ? document : null
) {
  const flagView = resolveViewFromFlag(rootDocument);
  if (flagView) {
    return flagView;
  }

  const datasetViewId = rootDocument?.body?.dataset?.uiView;
  const datasetEntry = findEntryById(datasetViewId);
  if (datasetEntry && canActivate(datasetEntry, rootDocument)) {
    return datasetEntry.view;
  }

  const firstAvailable = registeredViews.find(entry => canActivate(entry, rootDocument));
  if (firstAvailable) {
    return firstAvailable.view;
  }

  return registeredViews[0]?.view ?? null;
}

registerView(browserView, {
  guard: root => Boolean(root?.getElementById('browser-home'))
});

registerView(developerView, {
  guard: root => Boolean(root?.getElementById('developer-root'))
});

export default {
  registerView,
  unregisterView,
  getRegisteredViews,
  resolveInitialView
};
