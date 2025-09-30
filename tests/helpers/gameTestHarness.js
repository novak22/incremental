import { ensureTestDom } from './setupDom.js';

let harness;

export async function getGameTestHarness() {
  if (harness) return harness;

  ensureTestDom();

  const stateModule = await import('../../src/core/state.js');
  const registryModule = await import('../../src/core/state/registry.js');
  const assetStateModule = await import('../../src/core/state/assets.js');
  const assetsModule = await import('../../src/game/assets/index.js');
  const hustlesModule = await import('../../src/game/hustles.js');
  const upgradesModule = await import('../../src/game/upgrades.js');
  const requirementsModule = await import('../../src/game/requirements.js');
  const lifecycleModule = await import('../../src/game/lifecycle.js');
  const timeModule = await import('../../src/game/time.js');
  const currencyModule = await import('../../src/game/currency.js');
  const assistantModule = await import('../../src/game/assistant.js');
  const actionsModule = await import('../../src/game/actions.js');
  const logModule = await import('../../src/core/log.js');
  const storageModule = await import('../../src/core/storage.js');
  const offlineModule = await import('../../src/game/offline.js');
  const elementsModule = await import('../../src/ui/elements.js');

  registryModule.configureRegistry({
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
    return nextState;
  };

  harness = {
    stateModule,
    registryModule,
    assetStateModule,
    assetsModule,
    hustlesModule,
    upgradesModule,
    requirementsModule,
    lifecycleModule,
    timeModule,
    currencyModule,
    assistantModule,
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
