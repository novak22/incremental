import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

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

  const modifiers = [];
  const context = {
    upgrade: id => getUpgradeState(id),
    recordModifier: (label, amount, meta) => {
      modifiers.push({ label, amount, meta });
    }
  };

  assert.equal(action.progressAmount(context), 1, 'base progress should start at 1');
  let total = dropshippingDef.income.modifier(100, context);
  assert.equal(total, 100, 'income should be unchanged without upgrades');

  getUpgradeState('fulfillmentAutomation').purchased = true;
  assert.equal(action.progressAmount(context), 2, 'automation adds +1 progress');
  total = dropshippingDef.income.modifier(100, context);
  assert.ok(Math.abs(total - 125) < 1e-9, 'automation adds 25% payout');

  getUpgradeState('globalSupplyMesh').purchased = true;
  assert.equal(action.progressAmount(context), 3, 'mesh adds another +1 progress');
  total = dropshippingDef.income.modifier(100, context);
  assert.ok(Math.abs(total - 162.5) < 1e-9, 'mesh stacks a 30% multiplier');

  getUpgradeState('whiteLabelAlliance').purchased = true;
  assert.equal(action.progressAmount(context), 4, 'alliance adds final +1 progress');
  total = dropshippingDef.income.modifier(100, context);
  assert.ok(Math.abs(total - 219.375) < 1e-9, 'alliance stacks a 35% multiplier');

  const labels = modifiers.slice(-3).map(entry => entry.label);
  assert.deepEqual(
    labels,
    [
      'Fulfillment automation boost',
      'Global supply mesh boost',
      'White-label alliance boost'
    ],
    'should record modifiers for each tier'
  );
});

test('white-label alliance boosts stock photo income and marketing progress', () => {
  const promo = stockPhotosDef.quality.actions.find(item => item.id === 'runPromo');
  assert.ok(promo, 'stock photo marketing action missing');

  const context = {
    upgrade: id => getUpgradeState(id),
    recordModifier: () => {}
  };

  assert.equal(promo.progressAmount(context), 1, 'base marketing progress should be 1');
  let total = stockPhotosDef.income.modifier(100, context);
  assert.equal(total, 100, 'no upgrades should leave payouts unchanged');

  getUpgradeState('studioExpansion').purchased = true;
  assert.equal(promo.progressAmount(context), 2, 'studio expansion doubles marketing progress');
  total = stockPhotosDef.income.modifier(100, context);
  assert.ok(Math.abs(total - 120) < 1e-9, 'studio expansion keeps its 20% multiplier');

  getUpgradeState('whiteLabelAlliance').purchased = true;
  assert.equal(promo.progressAmount(context), 3, 'alliance adds +1 marketing progress');
  total = stockPhotosDef.income.modifier(100, context);
  assert.ok(Math.abs(total - 156) < 1e-9, 'alliance stacks an additional 30% multiplier');
});
