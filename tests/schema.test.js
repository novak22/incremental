import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from './helpers/setupDom.js';

ensureTestDom();

const { getAssetDefinition, getHustleDefinition } = await import('../src/core/state/registry.js');
const registryService = await import('../src/game/registryService.js');
const { ensureRegistryReady } = await import('../src/game/registryBootstrap.js');

function ensureConfigured() {
  registryService.resetRegistry();
  ensureRegistryReady();
}

test('hustle definitions expose canonical metric identifiers', () => {
  ensureConfigured();
  const hustle = getHustleDefinition('freelance');
  assert.ok(hustle?.action?.metricIds, 'hustle action should include metric ids');
  assert.equal(hustle.action.metricIds.time, 'hustle:freelance:time');
  assert.equal(hustle.action.metricIds.payout, 'hustle:freelance:payout');
  assert.equal(hustle.action.metricIds.cost, 'hustle:freelance:cost');
});

test('asset definitions expose canonical metric identifiers for core flows', () => {
  ensureConfigured();
  const asset = getAssetDefinition('blog');
  assert.ok(asset?.metricIds?.setup, 'asset should expose setup metric ids');
  assert.equal(asset.metricIds.setup.time, 'asset:blog:setup-time');
  assert.equal(asset.metricIds.setup.cost, 'asset:blog:setup-cost');
  assert.ok(asset.metricIds.maintenance, 'asset should expose maintenance metric ids');
  assert.equal(asset.metricIds.maintenance.time, 'asset:blog:maintenance-time');
  assert.equal(asset.metricIds.maintenance.cost, 'asset:blog:maintenance-cost');
  assert.ok(asset.metricIds.payout?.payout, 'asset should expose payout metric id');
  assert.equal(asset.metricIds.payout.payout, 'asset:blog:payout');
  const qualityAction = asset.quality?.actions?.find(action => action.id === 'seoSprint');
  assert.ok(qualityAction?.metricIds, 'quality action should include metric ids');
  assert.equal(qualityAction.metricIds.time, 'asset:blog:quality:seoSprint:time');
  assert.equal(qualityAction.metricIds.cost, 'asset:blog:quality:seoSprint:cost');
});
