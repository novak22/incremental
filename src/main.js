import { addLog, renderLog } from './core/log.js';
import { configureRegistry } from './core/state.js';
import { loadState, saveState } from './core/storage.js';
import elements from './ui/elements.js';
import { renderCards, updateUI } from './ui/update.js';
import { registry } from './game/registry.js';
import { endDay } from './game/lifecycle.js';
import { resetTick, startGameLoop } from './game/loop.js';
import { handleOfflineProgress } from './game/offline.js';

configureRegistry(registry);
const { returning, lastSaved } = loadState();
if (returning) {
  handleOfflineProgress(lastSaved);
  addLog('Welcome back! Your hustles kept buzzing while you were away.', 'info');
}
renderLog();
renderCards();
updateUI();
startGameLoop();

elements.endDayButton.addEventListener('click', () => endDay(false));

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    resetTick();
  }
});

window.addEventListener('beforeunload', saveState);
