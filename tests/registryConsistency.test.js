import test from 'node:test';
import assert from 'node:assert/strict';

import {
  configureRegistry,
  getRegistrySnapshot,
  getHustleDefinition as getHustleDefinitionFromState,
  getAssetDefinition as getAssetDefinitionFromState,
  getUpgradeDefinition as getUpgradeDefinitionFromState,
  getMetricDefinition as getMetricDefinitionFromState
} from '../src/core/state/registry.js';
import {
  loadRegistry,
  resetRegistry,
  getRegistry,
  getMetricDefinition
} from '../src/game/registryService.js';
import { ensureRegistryReady } from '../src/game/registryBootstrap.js';
import {
  buildHustleModels,
  buildAssetModels,
  buildUpgradeModels
} from '../src/ui/cards/model/index.js';

function createSampleDefinitions() {
  return {
    hustles: [
      {
        id: 'demoHustle',
        name: 'Demo Hustle',
        time: 2,
        payout: { amount: 80 },
        action: {
          label: () => 'Do the thing',
          onClick: () => {}
        }
      }
    ],
    assets: [
      {
        id: 'demoAsset',
        name: 'Demo Asset',
        singular: 'Demo Asset',
        tag: { label: 'Creative' },
        setup: { days: 1, time: 1, cost: 10 },
        maintenance: { time: 0.5, cost: 5 },
        payout: { amount: 40 }
      }
    ],
    upgrades: [
      {
        id: 'demoUpgrade',
        name: 'Demo Upgrade',
        category: 'tech',
        family: 'general',
        cost: 120
      }
    ]
  };
}

test('ensureRegistryReady hydrates and caches the shared snapshot', t => {
  resetRegistry();
  t.after(() => {
    resetRegistry();
  });

  const snapshot = ensureRegistryReady();
  assert.equal(snapshot, getRegistry(), 'ensure helper should return registry service snapshot');
  assert.equal(snapshot, getRegistrySnapshot(), 'state snapshot should match service snapshot');

  const secondCall = ensureRegistryReady();
  assert.equal(secondCall, snapshot, 'subsequent calls should reuse the cached snapshot');
});

test('registry service and state share canonical definitions', t => {
  resetRegistry();
  const definitions = createSampleDefinitions();
  loadRegistry(definitions);
  configureRegistry();
  t.after(() => {
    resetRegistry();
  });

  const stateSnapshot = getRegistrySnapshot();
  const serviceSnapshot = getRegistry();
  assert.equal(stateSnapshot, serviceSnapshot, 'state and service should reference the same registry object');

  const hustle = serviceSnapshot.hustles[0];
  const asset = serviceSnapshot.assets[0];
  const upgrade = serviceSnapshot.upgrades[0];

  assert.equal(getHustleDefinitionFromState(hustle.id), hustle, 'state hustle lookup should match service definition');
  assert.equal(getAssetDefinitionFromState(asset.id), asset, 'state asset lookup should match service definition');
  assert.equal(getUpgradeDefinitionFromState(upgrade.id), upgrade, 'state upgrade lookup should match service definition');

  const hustleMetricId = hustle.metricIds?.time;
  assert.ok(hustleMetricId, 'hustle metric id should exist');
  assert.equal(
    getMetricDefinitionFromState(hustleMetricId),
    getMetricDefinition(hustleMetricId),
    'metric lookup should stay in sync between state and service'
  );
});

test('ui builders consume processed registry definitions from the service', t => {
  resetRegistry();
  const definitions = createSampleDefinitions();
  loadRegistry(definitions);
  configureRegistry();
  t.after(() => {
    resetRegistry();
  });

  const { hustles, assets, upgrades } = getRegistry();

  const hustleModels = buildHustleModels(hustles, {
    getState: () => ({ hustles: {}, daily: {} })
  });
  assert.equal(hustleModels[0].id, hustles[0].id, 'hustle model should reflect service definition id');

  const assetModels = buildAssetModels(assets, {
    getState: () => ({ assets: { demoAsset: { instances: [] } } }),
    getAssetState: () => ({ instances: [] })
  });
  const firstGroup = assetModels.groups[0];
  assert.ok(firstGroup, 'asset groups should be generated from service definitions');
  const assetEntry = firstGroup.definitions.find(entry => entry.id === assets[0].id);
  assert.ok(assetEntry, 'asset definitions should flow into the UI model');
  assert.ok(
    assetEntry.definition.metricIds.setup.time.includes(assets[0].id),
    'asset metric ids should be present on UI definitions'
  );

  const upgradeModels = buildUpgradeModels(upgrades, {
    getState: () => ({ upgrades: {} })
  });
  const firstCategory = upgradeModels.categories[0];
  assert.ok(firstCategory, 'upgrade categories should be generated');
  const firstDefinition = firstCategory.families[0]?.definitions.find(entry => entry.id === upgrades[0].id);
  assert.ok(firstDefinition, 'upgrade definitions should appear in the UI model');
});
