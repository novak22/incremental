import { ensureTestDom } from './setupDom.js';

let harness;

export async function getGameTestHarness() {
  if (harness) return harness;

  ensureTestDom();

  const stateModule = await import('../../src/core/state.js');
  const assetsModule = await import('../../src/game/assets.js');
  const hustlesModule = await import('../../src/game/hustles.js');
  const upgradesModule = await import('../../src/game/upgrades.js');
  const requirementsModule = await import('../../src/game/requirements.js');
  const lifecycleModule = await import('../../src/game/lifecycle.js');
  const timeModule = await import('../../src/game/time.js');
  const currencyModule = await import('../../src/game/currency.js');
  const actionsModule = await import('../../src/game/actions.js');
  const logModule = await import('../../src/core/log.js');
  const storageModule = await import('../../src/core/storage.js');
  const offlineModule = await import('../../src/game/offline.js');
  const elementsModule = await import('../../src/ui/elements.js');

  stateModule.configureRegistry({
    assets: assetsModule.ASSETS,
    hustles: hustlesModule.HUSTLES,
    upgrades: upgradesModule.UPGRADES
  });

  const elements = elementsModule.default;

  const resetState = () => {
    const nextState = stateModule.initializeState(stateModule.buildDefaultState());
    if (elements.logFeed) {
      elements.logFeed.innerHTML = '';
    }
    if (elements.logTip) {
      elements.logTip.style.display = 'block';
    }
    if (elements.money) {
      elements.money.textContent = '';
    }
    if (elements.time) {
      elements.time.textContent = '';
    }
    if (elements.day) {
      elements.day.textContent = '';
    }
    return nextState;
  };

  harness = {
    stateModule,
    assetsModule,
    hustlesModule,
    upgradesModule,
    requirementsModule,
    lifecycleModule,
    timeModule,
    currencyModule,
    actionsModule,
    logModule,
    storageModule,
    offlineModule,
    elements,
    resetState
  };

  resetState();

  return harness;
}
