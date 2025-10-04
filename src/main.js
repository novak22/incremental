import { addLog, renderLog } from './core/log.js';
import { loadState, saveState } from './core/storage.js';
import { renderCards, updateUI } from './ui/update.js';
import { initLayoutControls } from './ui/layout/index.js';
import { resetTick, startGameLoop } from './game/loop.js';
import { handleOfflineProgress } from './game/offline.js';
import { initHeaderActionControls } from './ui/headerAction/index.js';
import { setActiveView } from './ui/viewManager.js';
import { resolveInitialView } from './ui/views/registry.js';
import { ensureRegistryReady } from './game/registryBootstrap.js';
import { dismissBootLoader } from './ui/bootLoader.js';

ensureRegistryReady();
const initialView = resolveInitialView(document);
setActiveView(initialView, document);
const { returning, lastSaved } = loadState({
  onFirstLoad: () =>
    addLog('Welcome to Online Hustle Simulator! Time to make that side cash.', 'info')
});
if (returning) {
  handleOfflineProgress(lastSaved);
}
renderLog();
renderCards();
updateUI();
initLayoutControls();
initHeaderActionControls();
startGameLoop();

window.requestAnimationFrame(() => {
  dismissBootLoader();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    resetTick();
  }
});

window.addEventListener('beforeunload', saveState);
