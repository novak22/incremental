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
  const elementRegistryModule = await import('../../src/ui/elements/registry.js');
  const viewManagerModule = await import('../../src/ui/viewManager.js');
  const classicViewModule = await import('../../src/ui/views/classic/index.js');
  const registryService = await import('../../src/game/registryService.js');
  const { ensureRegistryReady } = await import('../../src/game/registryBootstrap.js');

  viewManagerModule.setActiveView(classicViewModule.default, document);

  registryService.resetRegistry();
  ensureRegistryReady();

  const elements = {
    get money() {
      return elementRegistryModule.getElement('money');
    },
    get logFeed() {
      return (elementRegistryModule.getElement('logNodes') || {}).logFeed;
    },
    get logTip() {
      return (elementRegistryModule.getElement('logNodes') || {}).logTip;
    },
    get day() {
      return (elementRegistryModule.getElement('playerNodes') || {}).summary?.day;
    },
    get time() {
      return (elementRegistryModule.getElement('playerNodes') || {}).summary?.time;
    }
  };

  const resetState = () => {
    const nextState = stateModule.initializeState(stateModule.buildDefaultState());
    const logNodes = elementRegistryModule.getElement('logNodes') || {};
    if (logNodes.logFeed) {
      logNodes.logFeed.innerHTML = '';
    }
    if (logNodes.logTip) {
      logNodes.logTip.style.display = 'block';
    }
    const moneyNode = elementRegistryModule.getElement('money');
    if (moneyNode) {
      moneyNode.textContent = '';
    }
    const playerSummary = elementRegistryModule.getElement('playerNodes')?.summary || {};
    if (playerSummary.time) {
      playerSummary.time.textContent = '';
    }
    if (playerSummary.day) {
      playerSummary.day.textContent = '';
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
