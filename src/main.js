import { addLog, renderLog } from './core/log.js';
import { loadState, saveState } from './core/storage.js';
import { renderCards, updateUI } from './ui/update.js';
import { initLayoutControls } from './ui/layout/index.js';
import { initActionCatalogDebug } from './ui/debugCatalog.js';
import { resetTick, startGameLoop } from './game/loop.js';
import { handleOfflineProgress } from './game/offline.js';
import { initHeaderActionControls } from './ui/headerAction/index.js';
import { setActiveView } from './ui/viewManager.js';
import { resolveInitialView } from './ui/views/registry.js';
import { ensureRegistryReady } from './game/registryBootstrap.js';

ensureRegistryReady();
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
