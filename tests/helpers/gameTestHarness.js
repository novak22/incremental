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
  const browserViewModule = await import('../../src/ui/views/browser/index.js');
  const registryService = await import('../../src/game/registryService.js');
  const { ensureRegistryReady } = await import('../../src/game/registryBootstrap.js');

  viewManagerModule.setActiveView(browserViewModule.default, document);

  registryService.resetRegistry();
  ensureRegistryReady();

  const elements = {
    get browserNavigation() {
      return elementRegistryModule.getElement('browserNavigation');
    },
    get browserSessionControls() {
      return elementRegistryModule.getElement('browserSessionControls');
    },
    get browserNotifications() {
      return elementRegistryModule.getElement('browserNotifications');
    },
    get browserTabs() {
      return elementRegistryModule.getElement('browserTabs');
    },
    get homepageWidgets() {
      return elementRegistryModule.getElement('homepageWidgets');
    }
  };

  const resetState = () => {
    const nextState = stateModule.initializeState(stateModule.buildDefaultState());
    const notifications = elementRegistryModule.getElement('browserNotifications') || {};
    if (notifications.list) {
      notifications.list.innerHTML = '';
    }
    if (notifications.badge) {
      notifications.badge.hidden = true;
      notifications.badge.textContent = '0';
    }
    const homepageWidgets = elementRegistryModule.getElement('homepageWidgets') || {};
    const { todo, apps, bank } = homepageWidgets;
    if (todo?.list) {
      todo.list.innerHTML = '';
    }
    if (todo?.done) {
      todo.done.innerHTML = '';
    }
    if (todo?.availableValue) {
      todo.availableValue.textContent = '';
    }
    if (todo?.spentValue) {
      todo.spentValue.textContent = '';
    }
    if (apps?.list) {
      apps.list.innerHTML = '';
    }
    if (apps?.note) {
      apps.note.textContent = '';
    }
    if (bank?.stats) {
      bank.stats.innerHTML = '';
    }
    if (bank?.footnote) {
      bank.footnote.hidden = true;
      bank.footnote.textContent = '';
    }
    if (bank?.highlights) {
      bank.highlights.hidden = true;
      bank.highlights.innerHTML = '';
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
