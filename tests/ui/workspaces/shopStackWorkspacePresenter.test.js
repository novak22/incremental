import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createShopStackWorkspacePresenter } from '../../../src/ui/views/browser/components/shopstack/createShopStackWorkspace.js';
import {
  VIEW_CATALOG,
  VIEW_PURCHASES,
  VIEW_PRICING,
  reduceSearch
} from '../../../src/ui/views/browser/components/shopstack/state.js';
import { createDefinitionMap } from '../../../src/ui/views/browser/components/shopstack/catalogData.js';

function createSampleModel() {
  return {
    categories: [
      {
        id: 'automation',
        copy: { label: 'Automation' },
        families: [
          {
            id: 'assistants',
            copy: { label: 'Assistants' },
            definitions: [
              {
                id: 'speedBoost',
                name: 'Speed Boost',
                cost: 1200,
                description: 'Make fulfillment sparkle.',
                filters: { search: 'speed boost assistant sparkle' },
                snapshot: { ready: true, affordable: true },
                tag: { label: 'Tech', type: 'tech' }
              },
              {
                id: 'whiteGlove',
                name: 'White Glove Team',
                cost: 3500,
                description: 'A premium crew keeps clients delighted.',
                filters: { search: 'support premium white glove' },
                snapshot: { purchased: true, affordable: false },
                tag: { label: 'Crew', type: 'unlock' }
              }
            ]
          }
        ]
      }
    ]
  };
}

function createSampleDefinitions(events) {
  return [
    {
      id: 'speedBoost',
      name: 'Speed Boost',
      details: ['Faster packing runs', 'Integrates with your existing tooling.'],
      effects: { payout_mult: 1.1 },
      requirements: [{ type: 'upgrade', id: 'whiteGlove' }],
      action: { onClick: () => events.push('speedBoost') }
    },
    {
      id: 'whiteGlove',
      name: 'White Glove Team',
      details: ['Adds concierge staff'],
      repeatable: true,
      action: { onClick: () => events.push('whiteGlove') }
    }
  ];
}

test('createShopStackWorkspacePresenter renders catalog interactions and tabs', async t => {
  const dom = new JSDOM('<div id="root"></div>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.Node = dom.window.Node;

  t.after(() => {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.Node;
  });

  const mount = dom.window.document.getElementById('root');
  const events = [];
  const model = createSampleModel();
  const definitions = createSampleDefinitions(events);
  const definitionMap = createDefinitionMap(definitions);

  const presenter = createShopStackWorkspacePresenter();
  const summary = presenter.render(model, { mount, definitions });

  assert.equal(summary.meta, '1 upgrade ready');
  assert.equal(summary.urlPath, 'catalog/automation/speedBoost');

  const header = mount.querySelector('.shopstack__header');
  assert.ok(header, 'header should render');
  assert.match(header.textContent, /ShopStack/);
  assert.match(header.textContent, /2 items tracked/);

  const navButtons = [...mount.querySelectorAll('.shopstack-tab')];
  assert.equal(navButtons.length, 3);
  assert.deepEqual(navButtons.map(button => button.dataset.view), [VIEW_CATALOG, VIEW_PURCHASES, VIEW_PRICING]);

  const cards = [...mount.querySelectorAll('.shopstack-card')];
  assert.equal(cards.length, 2);
  assert.ok(cards[0].classList.contains('is-active'));
  assert.match(cards[0].textContent, /Speed Boost/);

  const detailTitle = mount.querySelector('.shopstack-detail__title');
  assert.ok(detailTitle.textContent.includes('Speed Boost'));

  // Trigger search filter for a different item
  presenter.updateAndRender(current => reduceSearch(current, model, definitionMap, 'white'));
  assert.match(mount.querySelector('.shopstack-detail__title').textContent, /White Glove Team/);

  // Narrow search back to the ready upgrade
  presenter.updateAndRender(current => reduceSearch(current, model, definitionMap, 'speed'));
  const filteredCards = [...mount.querySelectorAll('.shopstack-card')];
  assert.equal(filteredCards.length, 1);
  assert.match(filteredCards[0].textContent, /Speed Boost/);

  // Buy ready upgrade
  const buyButton = filteredCards[0].querySelector('.shopstack-card__buy');
  buyButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.deepEqual(events, ['speedBoost']);
  assert.ok(buyButton.disabled, 'button should disable after purchase');

  presenter.setView(VIEW_PURCHASES);
  const purchases = mount.querySelectorAll('.shopstack-purchase');
  assert.equal(purchases.length, 1);
  assert.match(purchases[0].textContent, /White Glove Team/);

  presenter.setView(VIEW_PRICING);
  assert.ok(mount.querySelector('.shopstack-pricing'));
});
