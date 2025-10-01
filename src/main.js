import { addLog, renderLog } from './core/log.js';
import { configureRegistry } from './core/state/registry.js';
import { loadState, saveState } from './core/storage.js';
import { renderCards, updateUI } from './ui/update.js';
import { initLayoutControls } from './ui/layout.js';
import { initActionCatalogDebug } from './ui/debugCatalog.js';
import { resetTick, startGameLoop } from './game/loop.js';
import { handleOfflineProgress } from './game/offline.js';
import { initHeaderActionControls } from './ui/headerAction.js';
import { setActiveView } from './ui/viewManager.js';
import classicView from './ui/views/classic/index.js';
import { loadDefaultRegistry } from './game/registryLoader.js';

loadDefaultRegistry();
configureRegistry();
setActiveView(classicView, document);
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
