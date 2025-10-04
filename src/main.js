import { addLog, renderLog } from './core/log.js';
import { createStorage } from './core/storage.js';
import { defaultStateManager } from './core/state.js';
import { createCurrencyModule } from './game/currency.js';
import { createActionExecutor } from './game/actions.js';
import { renderCards, updateUI } from './ui/update.js';
import { initLayoutControls } from './ui/layout/index.js';
import { resetTick, startGameLoop } from './game/loop.js';
import { handleOfflineProgress } from './game/offline.js';
import { initHeaderActionControls } from './ui/headerAction/index.js';
import { setActiveView } from './ui/viewManager.js';
import { resolveInitialView } from './ui/views/registry.js';
import { ensureRegistryReady } from './game/registryBootstrap.js';
import { dismissBootLoader } from './ui/bootLoader.js';

function createAppContext() {
  const stateManager = defaultStateManager;
  const storage = createStorage({ stateManager });
  const currency = createCurrencyModule({ stateManager });
  const actions = {
    executeAction: createActionExecutor({
      saveState: storage.saveState
    })
  };

  return {
    stateManager,
    storage,
    currency,
    actions
  };
}

ensureRegistryReady();
const appContext = createAppContext();
const initialView = resolveInitialView(document);
setActiveView(initialView, document);
const { loadState, saveState } = appContext.storage;
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
