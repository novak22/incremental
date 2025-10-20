import assert from 'node:assert/strict';
import test from 'node:test';

import { configureRegistry } from '../src/core/state/registry.js';
import { getAssetMetricId } from '../src/game/assets/helpers.js';
import { loadRegistry, resetRegistry } from '../src/game/registryService.js';

function setupRegistry(assets = []) {
  resetRegistry();
  loadRegistry({ assets, actions: [], upgrades: [], hustles: [] });
  configureRegistry();
}

test('getAssetMetricId returns explicit metric ids when provided', t => {
  const contentFarm = {
    id: 'contentFarm',
    metricIds: {
      inventory: { payout: 'metric:inventory:payout' },
      payout: { payout: 'metric:payout:override' }
    }
  };

  setupRegistry([contentFarm]);
  t.after(() => {
    resetRegistry();
  });

  assert.equal(getAssetMetricId('contentFarm', 'inventory', 'payout'), 'metric:inventory:payout');
  assert.equal(getAssetMetricId(contentFarm, 'inventory', 'payout'), 'metric:inventory:payout');
  assert.equal(getAssetMetricId('contentFarm', 'payout', 'payout'), 'metric:payout:override');
});

test('getAssetMetricId builds fallback ids for asset metrics', t => {
  const newsSite = { id: 'newsSite' };

  setupRegistry([newsSite]);
  t.after(() => {
    resetRegistry();
  });

  assert.equal(getAssetMetricId('newsSite', 'inventory', 'payout'), 'asset:newsSite:inventory-payout');
  assert.equal(getAssetMetricId('newsSite', 'inventory', 'production'), 'asset:newsSite:inventory-production');
  assert.equal(getAssetMetricId('newsSite', 'payout', 'payout'), 'asset:newsSite:payout');
  assert.equal(getAssetMetricId('newsSite', 'sale', 'payout'), 'asset:newsSite:sale');
});

test('getAssetMetricId safely handles unknown assets and inputs', t => {
  setupRegistry([]);
  t.after(() => {
    resetRegistry();
  });

  assert.equal(getAssetMetricId('missing', 'inventory', 'payout'), null);
  assert.equal(getAssetMetricId(null, 'inventory', 'payout'), null);
  assert.equal(getAssetMetricId({ metricIds: {} }, 'inventory', 'payout'), null);
});
