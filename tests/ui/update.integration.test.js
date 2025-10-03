import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';
import { getGameTestHarness } from '../helpers/gameTestHarness.js';

test('renderCards hydrates browser homepage widgets when registry is empty', { concurrency: false }, async t => {
  ensureTestDom();
  const registryService = await import('../../src/game/registryService.js');
  const updateModule = await import('../../src/ui/update.js');
  const storageModule = await import('../../src/core/storage.js');

  registryService.resetRegistry();
  global.localStorage?.clear?.();
  storageModule.loadState();

  updateModule.renderCards();

  const todoList = document.getElementById('browser-widget-todo-list');
  assert.ok(todoList, 'expected todo list container to exist');

  const workspaceHost = document.getElementById('browser-workspaces');
  const workspaceSections = workspaceHost?.querySelectorAll('[data-browser-page]') ?? [];
  assert.ok(workspaceSections.length > 0, 'expected workspace sections to be initialized');

  const notificationsContainer = document.querySelector('[data-role="browser-notifications"]');
  assert.ok(notificationsContainer, 'expected notifications container to exist after render');

  t.after(() => {
    registryService.resetRegistry();
  });
});

test('browser view update flow renders homepage widgets and workspaces', { concurrency: false }, async () => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const state = harness.resetState();

  const advancedAsset = harness.assetsModule.ASSETS.find(asset => asset.tag?.type === 'advanced')
    || harness.assetsModule.ASSETS[0];
  const { createAssetInstance, getAssetState } = harness.stateModule;
  const activeInstance = createAssetInstance(
    advancedAsset,
    {
      status: 'active',
      maintenanceFundedToday: false,
      lastIncome: 48,
      totalIncome: 96
    },
    { state }
  );
  const setupInstance = createAssetInstance(
    advancedAsset,
    { status: 'setup', daysRemaining: 2 },
    { state }
  );
  const assetState = getAssetState(advancedAsset.id, state);
  assetState.instances = [activeInstance, setupInstance];

  const updateModule = await import('../../src/ui/update.js');
  const layoutModule = await import('../../src/ui/layout/index.js');

  layoutModule.initLayoutControls();

  updateModule.renderCards();
  updateModule.updateUI();

  const widgets = harness.elements.homepageWidgets;
  const todoWidget = widgets?.todo;
  assert.ok(todoWidget?.list, 'expected todo widget lookup');
  assert.ok(todoWidget.list.children.length > 0, 'expected todo widget to list recommended actions');
  assert.ok(todoWidget.done, 'expected todo done list lookup to exist');

  const bankWidget = widgets?.bank;
  assert.ok(bankWidget?.stats, 'expected bank widget lookup');
  assert.ok(bankWidget.stats.children.length > 0, 'expected bank widget statistics to render');

  const appsWidget = widgets?.apps;
  assert.ok(appsWidget?.list, 'expected apps widget lookup');
  assert.ok(appsWidget.list.children.length > 0, 'expected apps widget to list available workspaces');

  const workspaceHost = document.getElementById('browser-workspaces');
  assert.ok(workspaceHost, 'expected workspace host element');

  const learnlyWorkspace = workspaceHost.querySelector('[data-browser-page="learnly"] [data-role="learnly-root"]');
  assert.ok(learnlyWorkspace, 'expected Learnly workspace to mount inside the browser shell');

  const financeWorkspace = workspaceHost.querySelector('[data-browser-page="bankapp"] .bankapp-section');
  assert.ok(financeWorkspace, 'expected BankApp workspace content to render');

  const siteLaunchers = document.querySelectorAll('[data-site-target]');
  assert.ok(siteLaunchers.length > 0, 'expected browser shell to expose site launch controls');

  const notifications = harness.elements.browserNotifications;
  assert.ok(notifications?.container, 'expected browser notifications container');
  assert.ok(notifications.button, 'expected notifications trigger to be available');
});
