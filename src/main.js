import { addLog, renderLog } from './core/log.js';
import { configureRegistry } from './core/state.js';
import { loadState, saveState } from './core/storage.js';
import { renderCards, updateUI } from './ui/update.js';
import { initLayoutControls } from './ui/layout.js';
import { initActionCatalogDebug } from './ui/debugCatalog.js';
import { registry } from './game/registry.js';
import { resetTick, startGameLoop } from './game/loop.js';
import { handleOfflineProgress } from './game/offline.js';
import { initHeaderActionControls } from './ui/headerAction.js';

configureRegistry(registry);
const { returning, lastSaved } = loadState();
if (returning) {
  handleOfflineProgress(lastSaved);
  addLog('Welcome back! Your hustles kept buzzing while you were away.', 'info');
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
