import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSET_EVENT_BLUEPRINTS, NICHE_EVENT_BLUEPRINTS } from '../../../src/game/events/config.js';

const expectedAssetBlueprintIds = [
  'asset:viralTrend',
  'asset:platformSetback',
  'asset:blogQualityCelebration',
  'asset:vlogQualityCelebration',
  'asset:dropshippingQualityCelebration',
  'asset:saasQualityCelebration',
  'asset:ebookQualityCelebration',
  'asset:stockPhotosQualityCelebration'
];

const expectedNicheBlueprintIds = ['niche:trendWave', 'niche:trendDip'];

test('asset event blueprints retain expected ordering', () => {
  const ids = ASSET_EVENT_BLUEPRINTS.map(blueprint => blueprint.id);
  assert.deepEqual(ids, expectedAssetBlueprintIds);
});

test('niche event blueprints retain expected ordering', () => {
  const ids = NICHE_EVENT_BLUEPRINTS.map(blueprint => blueprint.id);
  assert.deepEqual(ids, expectedNicheBlueprintIds);
});
