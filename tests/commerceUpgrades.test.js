import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';
import { getAssetEffectMultiplier } from '../src/game/upgrades/effects.js';

const harness = await getGameTestHarness();
const { stateModule, upgradesModule, requirementsModule, assetsModule } = harness;
const { getState, getUpgradeState, getAssetState } = stateModule;
const { getKnowledgeProgress } = requirementsModule;
const { UPGRADES } = upgradesModule;

const dropshippingDef = assetsModule.ASSETS.find(def => def.id === 'dropshipping');
const stockPhotosDef = assetsModule.ASSETS.find(def => def.id === 'stockPhotos');

function getUpgradeDefinition(id) {
  const upgrade = UPGRADES.find(item => item.id === id);
  assert.ok(upgrade, `upgrade ${id} missing from catalog`);
  return upgrade;
}

test.beforeEach(() => {
  const state = harness.resetState();
  state.money = 20000;
});

test('fulfillment automation unlocks with active shops and E-Commerce Playbook', () => {
  const upgrade = getUpgradeDefinition('fulfillmentAutomation');
  const state = getState();
  state.money = 10000;

  assert.equal(upgrade.action.disabled(), true, 'should be locked before meeting requirements');

  const dropshipping = getAssetState('dropshipping');
  dropshipping.instances = [
    { status: 'active' },
    { status: 'active' }
  ];
  getKnowledgeProgress('ecomPlaybook').completed = true;

  assert.equal(upgrade.action.disabled(), false, 'should unlock after shops and study complete');
});

test('global supply mesh waits for automation, extra shop, and photo studies', () => {
  const upgrade = getUpgradeDefinition('globalSupplyMesh');
  const state = getState();
  state.money = 15000;

  assert.equal(upgrade.action.disabled(), true, 'should be locked without prerequisites');

  getUpgradeState('fulfillmentAutomation').purchased = true;
  const dropshipping = getAssetState('dropshipping');
  dropshipping.instances = [
    { status: 'active' },
    { status: 'active' },
    { status: 'active' }
  ];
  getKnowledgeProgress('photoLibrary').completed = true;

  assert.equal(upgrade.action.disabled(), false, 'should unlock once automation, shops, and study are ready');
});

test('white-label alliance needs mesh, four shops, and both studies', () => {
  const upgrade = getUpgradeDefinition('whiteLabelAlliance');
  const state = getState();
  state.money = 20000;

  assert.equal(upgrade.action.disabled(), true, 'should be locked before chain is complete');

  getUpgradeState('fulfillmentAutomation').purchased = true;
  getUpgradeState('globalSupplyMesh').purchased = true;
  const dropshipping = getAssetState('dropshipping');
  dropshipping.instances = [
    { status: 'active' },
    { status: 'active' },
    { status: 'active' },
    { status: 'active' }
  ];
  getKnowledgeProgress('ecomPlaybook').completed = true;
  getKnowledgeProgress('photoLibrary').completed = true;

  assert.equal(upgrade.action.disabled(), false, 'should unlock once every requirement is satisfied');
});

test('commerce ladder stacks dropshipping progress and multipliers', () => {
  const action = dropshippingDef.quality.actions.find(item => item.id === 'researchProduct');
  assert.ok(action, 'dropshipping research action missing');

  const qualityMultiplier = () =>
    getAssetEffectMultiplier(dropshippingDef, 'quality_progress_mult', {
      actionType: 'quality'
    });
  const payoutMultiplier = () =>
    getAssetEffectMultiplier(dropshippingDef, 'payout_mult', {
      actionType: 'payout'
    });

  assert.equal(action.progressAmount({}), 1, 'base progress should start at 1');
  assert.equal(qualityMultiplier().multiplier, 1, 'quality multiplier starts neutral');
  assert.equal(payoutMultiplier().multiplier, 1, 'payout multiplier starts neutral');

  getUpgradeState('fulfillmentAutomation').purchased = true;
  assert.equal(qualityMultiplier().multiplier, 2, 'automation doubles dropshipping quality progress');
  assert.ok(Math.abs(payoutMultiplier().multiplier - 1.25) < 1e-9, 'automation adds 25% payout');

  getUpgradeState('globalSupplyMesh').purchased = true;
  assert.ok(Math.abs(qualityMultiplier().multiplier - 3) < 1e-9, 'mesh adds 1.5× quality progress (total 3)');
  assert.ok(Math.abs(payoutMultiplier().multiplier - 1.625) < 1e-9, 'mesh stacks a 30% multiplier (total 1.625×)');

  getUpgradeState('whiteLabelAlliance').purchased = true;
  assert.ok(Math.abs(qualityMultiplier().multiplier - 4) < 1e-9, 'alliance lifts quality progress to 4× overall');
  assert.ok(Math.abs(payoutMultiplier().multiplier - 2.19375) < 1e-9, 'alliance stacks a 35% multiplier');

  const sources = qualityMultiplier().sources.map(entry => entry.id);
  assert.deepEqual(
    sources,
    ['fulfillmentAutomation', 'globalSupplyMesh', 'whiteLabelAlliance'],
    'quality multiplier should list each commerce upgrade'
  );
});

test('white-label alliance boosts stock photo income and marketing progress', () => {
  const promo = stockPhotosDef.quality.actions.find(item => item.id === 'runPromo');
  assert.ok(promo, 'stock photo marketing action missing');

  const qualityMultiplier = () =>
    getAssetEffectMultiplier(stockPhotosDef, 'quality_progress_mult', {
      actionType: 'quality'
    });
  const payoutMultiplier = () =>
    getAssetEffectMultiplier(stockPhotosDef, 'payout_mult', {
      actionType: 'payout'
    });

  assert.equal(promo.progressAmount({}), 1, 'base marketing progress should be 1');
  assert.equal(qualityMultiplier().multiplier, 1, 'quality multiplier starts neutral');
  assert.equal(payoutMultiplier().multiplier, 1, 'payout multiplier starts neutral');

  getUpgradeState('studioExpansion').purchased = true;
  assert.equal(qualityMultiplier().multiplier, 2, 'studio expansion doubles marketing progress');
  assert.ok(Math.abs(payoutMultiplier().multiplier - 1.15) < 1e-9, 'studio expansion keeps its 15% multiplier');

  getUpgradeState('whiteLabelAlliance').purchased = true;
  assert.ok(Math.abs(qualityMultiplier().multiplier - (2 * 1.3333333333333333)) < 1e-9, 'alliance adds a 1.33× marketing boost');
  assert.ok(Math.abs(payoutMultiplier().multiplier - 1.5525) < 1e-9, 'alliance stacks an additional 35% multiplier on top of studio expansion');
});
