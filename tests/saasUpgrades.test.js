import test from 'node:test';
import assert from 'node:assert/strict';
import { getGameTestHarness } from './helpers/gameTestHarness.js';

const harness = await getGameTestHarness();
const { stateModule, upgradesModule, requirementsModule, assetsModule } = harness;
const { getState, getUpgradeState, getAssetState } = stateModule;
const { getKnowledgeProgress } = requirementsModule;
const { UPGRADES } = upgradesModule;
const { ASSETS } = assetsModule;

const saasDefinition = ASSETS.find(asset => asset.id === 'saas');
const globalOps = UPGRADES.find(upgrade => upgrade.id === 'globalOpsCenter');

const resetState = () => harness.resetState();

test.beforeEach(() => {
  resetState();
});

test('global ops center unlocks once SaaS prerequisites are satisfied', () => {
  const state = getState();
  state.money = 5000;

  assert.ok(globalOps.action.disabled(), 'should be disabled with missing requirements');

  getUpgradeState('serverEdge').purchased = true;
  const automation = getKnowledgeProgress('automationCourse');
  automation.completed = true;
  const saasState = getAssetState('saas');
  saasState.instances = [
    { id: 'a', status: 'active' },
    { id: 'b', status: 'active' }
  ];

  assert.equal(globalOps.action.disabled(), false, 'requirements met should unlock the upgrade');
});

test('saas income modifier stacks new upgrade multipliers', () => {
  const compute = () => {
    const events = [];
    const value = saasDefinition.income.modifier(100, {
      recordModifier: (_label, _delta, meta) => {
        events.push(meta.id);
      }
    });
    return { value, events };
  };

  let result = compute();
  assert.equal(result.value, 100);
  assert.deepEqual(result.events, []);

  getUpgradeState('serverEdge').purchased = true;
  result = compute();
  assert.equal(result.value, 135);
  assert.deepEqual(result.events, ['serverEdge']);

  getUpgradeState('globalOpsCenter').purchased = true;
  result = compute();
  assert.ok(Math.abs(result.value - 189) < 1e-6);
  assert.deepEqual(result.events, ['serverEdge', 'globalOpsCenter']);

  getUpgradeState('predictiveInsights').purchased = true;
  result = compute();
  assert.ok(Math.abs(result.value - 226.8) < 1e-6);
  assert.deepEqual(result.events, ['serverEdge', 'globalOpsCenter', 'predictiveInsights']);

  getUpgradeState('autonomousSupport').purchased = true;
  result = compute();
  assert.ok(Math.abs(result.value - 283.5) < 1e-6);
  assert.deepEqual(result.events, [
    'serverEdge',
    'globalOpsCenter',
    'predictiveInsights',
    'autonomousSupport'
  ]);
});

test('saas progress bonuses and cooldown tweaks stack across upgrades', () => {
  const actions = Object.fromEntries(saasDefinition.quality.actions.map(action => [action.id, action]));
  const context = { upgrade: id => getUpgradeState(id) };

  assert.equal(actions.shipFeature.progressAmount(context), 1);
  assert.equal(actions.deployEdgeNodes.cooldownDays(context), 2);

  getUpgradeState('serverEdge').purchased = true;
  assert.equal(actions.shipFeature.progressAmount(context), 2);

  getUpgradeState('globalOpsCenter').purchased = true;
  getUpgradeState('predictiveInsights').purchased = true;
  assert.equal(actions.shipFeature.progressAmount(context), 4);

  getUpgradeState('autonomousSupport').purchased = true;
  assert.equal(actions.improveStability.progressAmount(context), 6);
  assert.equal(actions.deployEdgeNodes.progressAmount(context), 6);
  assert.equal(actions.deployEdgeNodes.cooldownDays(context), 1);
});
