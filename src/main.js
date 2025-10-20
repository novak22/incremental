import { addLog, renderLog } from './core/log.js';
import { createStorage } from './core/storage.js';
import { defaultStateManager } from './core/state.js';
import { createCurrencyModule } from './game/currency.js';
import { createActionExecutor } from './game/actions.js';
import {
  renderCards,
  updateUI,
  ensureUpdateSubscriptions,
  teardownUpdateSubscriptions
} from './ui/update.js';
import { initLayoutControls } from './ui/layout/index.js';
import { resetTick, startGameLoop } from './game/loop.js';
import { handleOfflineProgress } from './game/offline.js';
import { initHeaderActionControls } from './ui/headerAction/index.js';
import { initSessionSwitcher } from './ui/headerAction/sessionSwitcher.js';
import { setActiveView } from './ui/viewManager.js';
import { resolveInitialView } from './ui/views/registry.js';
import { ensureRegistryReady } from './game/registryBootstrap.js';
import { dismissBootLoader } from './ui/bootLoader.js';
import { ensureDailyOffersForDay } from './game/hustles.js';

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
const { storage, stateManager } = appContext;
const initialView = resolveInitialView(document);
setActiveView(initialView, document);

let sessionSwitcherController = null;

const originalSaveState = storage.saveState.bind(storage);
function wrappedSaveState(...args) {
  const result = originalSaveState(...args);
  sessionSwitcherController?.render();
  return result;
}

storage.saveState = wrappedSaveState;
appContext.actions.executeAction = createActionExecutor({
  saveState: wrappedSaveState
});

function finalizeLoad(loadResult = {}, { reason } = {}) {
  const { returning, lastSaved } = loadResult || {};
  if (returning && Number.isFinite(lastSaved)) {
    handleOfflineProgress(lastSaved);
  }

  const liveState = stateManager.getState();
  ensureDailyOffersForDay({ state: liveState, day: liveState?.day });

  if (!returning) {
    if (reason === 'create') {
      addLog('Fresh save slot ready! Time to craft a brand-new legend.', 'info');
    } else if (reason === 'reset') {
      addLog('Session reset complete — day one energy restored!', 'info');
    }
  }

  renderLog();
  renderCards();
  updateUI();
  initHeaderActionControls();
  sessionSwitcherController?.render();
}

function runSessionOperation(operation, { reason, loadOptions } = {}) {
  teardownUpdateSubscriptions();
  let result = null;
  try {
    result = operation(loadOptions ?? {});
  } catch (error) {
    console?.error?.('Failed to perform session operation', error);
    ensureUpdateSubscriptions();
    sessionSwitcherController?.render();
    return null;
  }

  ensureUpdateSubscriptions();
  const loadResult =
    result?.loadResult ?? (result && typeof result === 'object' && 'returning' in result ? result : null);

  if (loadResult) {
    finalizeLoad(loadResult, { reason });
  } else {
    sessionSwitcherController?.render();
  }

  return result;
}

sessionSwitcherController = initSessionSwitcher({
  storage,
  document,
  onCreateSession: ({ name }) =>
    runSessionOperation(loadOptions => storage.createSession({ name }, loadOptions), { reason: 'create' }),
  onActivateSession: ({ id }) =>
    runSessionOperation(loadOptions => storage.setActiveSession(id, loadOptions), { reason: 'switch' }),
  onDeleteSession: ({ id }) =>
    runSessionOperation(loadOptions => storage.deleteSession(id, loadOptions), { reason: 'delete' }),
  onRenameSession: ({ id, name }) => {
    const result = storage.renameSession(id, name);
    sessionSwitcherController?.render();
    return result;
  },
  onResetActiveSession: () =>
    runSessionOperation(loadOptions => storage.resetActiveSession(loadOptions), { reason: 'reset' }),
  onSaveSession: () => wrappedSaveState(),
  onExportSession: ({ id }) => storage.exportSession({ id }),
  onImportSession: ({ data }) =>
    runSessionOperation(loadOptions => storage.importSession(data, loadOptions), { reason: 'import' })
});

runSessionOperation(
  loadOptions =>
    storage.loadState({
      ...loadOptions,
      onFirstLoad: () =>
        addLog('Welcome to Online Hustle Simulator! Time to make that side cash.', 'info')
    }),
  { reason: 'startup' }
);

initLayoutControls();
startGameLoop();

window.requestAnimationFrame(() => {
  dismissBootLoader();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    resetTick();
  }
});

window.addEventListener('beforeunload', () => {
  teardownUpdateSubscriptions();
  wrappedSaveState();
});
