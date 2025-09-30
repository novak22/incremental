import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureTestDom } from './helpers/setupDom.js';

ensureTestDom();

function createUpgradeDefinition(id, name) {
  return {
    id,
    name,
    category: 'tech',
    family: 'general',
    tag: { label: 'Test upgrade' },
    cost: 0,
    description: `${name} description`,
    details: [],
    action: {
      label: 'Buy',
      onClick: () => {},
      disabled: () => false
    }
  };
}

test('updateAllCards renders new upgrade definitions', async () => {
  const { renderCardCollections, updateAllCards } = await import('../src/ui/cards/index.js');
  const stateModule = await import('../src/core/state.js');
  const { configureRegistry, initializeState } = stateModule;
  const { registry } = await import('../src/game/registry.js');

  configureRegistry(registry);
  initializeState();

  const upgradeList = document.getElementById('upgrade-list');
  upgradeList.innerHTML = '';

  const first = createUpgradeDefinition('alpha', 'Alpha Upgrade');
  renderCardCollections({ hustles: [], education: [], assets: [], upgrades: [first] });

  let renderedIds = Array.from(document.querySelectorAll('[data-upgrade]')).map(node => node.dataset.upgrade);
  assert.deepEqual(renderedIds, ['alpha']);

  const second = createUpgradeDefinition('beta', 'Beta Upgrade');
  updateAllCards({ hustles: [], education: [], assets: [], upgrades: [first, second] });

  renderedIds = Array.from(document.querySelectorAll('[data-upgrade]')).map(node => node.dataset.upgrade).sort();
  assert.deepEqual(renderedIds, ['alpha', 'beta']);
});
