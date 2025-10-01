import { addLog, renderLog } from './core/log.js';
import { configureRegistry } from './core/state/registry.js';
import { loadState, saveState } from './core/storage.js';
import { renderCards, updateUI } from './ui/update.js';
import { initLayoutControls } from './ui/layout/index.js';
import { initActionCatalogDebug } from './ui/debugCatalog.js';
import { resetTick, startGameLoop } from './game/loop.js';
import { handleOfflineProgress } from './game/offline.js';
import { initHeaderActionControls } from './ui/headerAction/index.js';
import { setActiveView } from './ui/viewManager.js';
import classicView from './ui/views/classic/index.js';
import browserView from './ui/views/browser/index.js';
import { loadDefaultRegistry } from './game/registryLoader.js';

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

  const normalizedId = requestedId.toLowerCase();
  if (normalizedId === browserView.id && rootDocument?.getElementById('browser-home')) {
    return browserView;
  }
  if (normalizedId === classicView.id && rootDocument?.getElementById('tab-dashboard')) {
    return classicView;
  }

  return null;
}

function resolveInitialView(rootDocument = typeof document !== 'undefined' ? document : null) {
  const flagView = resolveViewFromFlag(rootDocument);
  if (flagView) {
    return flagView;
  }

  const viewId = rootDocument?.body?.dataset?.uiView;
  if (viewId === browserView.id && rootDocument?.getElementById('browser-home')) {
    return browserView;
  }
  return classicView;
}

loadDefaultRegistry();
configureRegistry();
const initialView = resolveInitialView(document);
setActiveView(initialView, document);
const { returning, lastSaved } = loadState({
  onFirstLoad: () =>
    addLog('Welcome to Online Hustle Simulator! Time to make that side cash.', 'info'),
  onReturning: () =>
    addLog('Welcome back! Your hustles kept buzzing while you were away.', 'info')
});
if (returning) {
  handleOfflineProgress(lastSaved);
}
renderLog();
renderCards();
updateUI();
initLayoutControls();
initHeaderActionControls();
initActionCatalogDebug();
startGameLoop();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    resetTick();
  }
});

window.addEventListener('beforeunload', saveState);
