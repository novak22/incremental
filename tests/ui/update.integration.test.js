import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from '../helpers/setupDom.js';
import { getGameTestHarness } from '../helpers/gameTestHarness.js';

test('renderCards hydrates registry when service is empty', { concurrency: false }, async t => {
  ensureTestDom();
  const registryService = await import('../../src/game/registryService.js');
  const updateModule = await import('../../src/ui/update.js');
  const storageModule = await import('../../src/core/storage.js');

  registryService.resetRegistry();
  global.localStorage?.clear?.();
  storageModule.loadState();

  updateModule.renderCards();

  const hustleList = document.getElementById('hustle-list');
  assert.ok(hustleList?.children.length > 0, 'expected hustle cards after fallback registry load');

  t.after(() => {
    registryService.resetRegistry();
  });
});

test('classic view update flow routes through cards presenter with dashboard and filters intact', { concurrency: false }, async t => {
  ensureTestDom();
  const harness = await getGameTestHarness();
  const state = harness.resetState();

  const advancedAsset = harness.assetsModule.ASSETS.find(asset => asset.tag?.type === 'advanced')
    || harness.assetsModule.ASSETS[0];
  const ventureRiskLevel = advancedAsset?.tag?.type === 'advanced' ? 'high' : 'medium';
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
  const layoutModule = await import('../../src/ui/layout.js');
  const classicModule = await import('../../src/ui/views/classic/index.js');

  layoutModule.initLayoutControls();
  const presenter = classicModule.default.presenters.cards;
  const presenterCalls = [];
  const originalRenderAll = presenter.renderAll;
  const originalUpdate = presenter.update;
  presenter.renderAll = payload => {
    presenterCalls.push({ type: 'renderAll', payload });
    return originalRenderAll(payload);
  };
  presenter.update = payload => {
    presenterCalls.push({ type: 'update', payload });
    return originalUpdate(payload);
  };

  t.after(() => {
    presenter.renderAll = originalRenderAll;
    presenter.update = originalUpdate;
  });

  updateModule.renderCards();
  updateModule.updateUI();

  assert.ok(
    presenterCalls.some(call => call.type === 'renderAll'),
    'expected cards presenter to handle initial render'
  );
  const updateCall = presenterCalls.find(call => call.type === 'update');
  assert.ok(updateCall, 'expected cards presenter update to run');

  const { registries, models } = updateCall.payload ?? {};
  assert.ok(models, 'expected update payload to include view models');
  assert.ok(Array.isArray(models.hustles), 'expected hustle models array');
  assert.ok(Array.isArray(models.assets?.groups), 'expected asset group models');
  assert.ok(Array.isArray(models.upgrades?.categories), 'expected upgrade category models');
  assert.ok(Array.isArray(registries?.hustles), 'expected hustle registry list');

  const netValueNode = document.getElementById('kpi-net-value');
  assert.ok(netValueNode?.textContent?.trim().length > 0, 'expected dashboard KPI text content');

  const hustleList = document.getElementById('hustle-list');
  assert.ok(hustleList?.children.length > 0, 'expected hustle list to render cards');

  const hustleCards = () => Array.from(hustleList.querySelectorAll('[data-hustle]'));
  const totalCards = hustleCards().length;
  assert.ok(totalCards > 0, 'expected hustle cards to be present for filtering');

  const availableToggle = document.getElementById('hustle-available-toggle');
  availableToggle.checked = true;
  layoutModule.applyCardFilters();
  const visibleAfterAvailability = hustleCards().filter(card => !card.hidden).length;
  assert.ok(
    visibleAfterAvailability < totalCards,
    'expected availability filter to hide unavailable hustles'
  );

  const searchInput = document.getElementById('hustle-search');
  searchInput.value = 'Consult';
  layoutModule.applyCardFilters();
  const visibleAfterSearch = hustleCards().filter(card => !card.hidden).length;
  assert.ok(
    visibleAfterSearch <= visibleAfterAvailability,
    'expected search filter to further reduce visible hustles'
  );

  // Reset filters for cleanliness.
  availableToggle.checked = false;
  searchInput.value = '';
  layoutModule.applyCardFilters();

  const ventureGallery = document.getElementById('venture-gallery');
  const ventureCards = () => Array.from(ventureGallery.querySelectorAll('[data-asset]'));
  const visibleVentures = () => ventureCards().filter(card => !card.hidden);
  assert.ok(ventureCards().length >= 2, 'expected venture cards to render for filtering');

  const ventureActiveToggle = document.getElementById('venture-active-toggle');
  ventureActiveToggle.checked = true;
  layoutModule.applyCardFilters();
  assert.ok(
    visibleVentures().every(card => card.dataset.state === 'active'),
    'expected active filter to show only active ventures'
  );

  ventureActiveToggle.checked = false;
  const ventureMaintenanceToggle = document.getElementById('venture-maintenance-toggle');
  ventureMaintenanceToggle.checked = true;
  layoutModule.applyCardFilters();
  assert.ok(
    visibleVentures().every(card => card.dataset.needsMaintenance === 'true'),
    'expected maintenance filter to surface upkeep-needy ventures'
  );

  ventureMaintenanceToggle.checked = false;
  const ventureRiskToggle = document.getElementById('venture-risk-toggle');
  ventureRiskToggle.checked = true;
  layoutModule.applyCardFilters();
  if (ventureRiskLevel === 'high') {
    assert.equal(
      visibleVentures().length,
      0,
      'expected risk filter to hide high-risk ventures'
    );
  } else {
    assert.equal(
      visibleVentures().length,
      ventureCards().length,
      'expected risk filter to keep medium-risk ventures visible'
    );
  }

  ventureRiskToggle.checked = false;
  layoutModule.applyCardFilters();
});
