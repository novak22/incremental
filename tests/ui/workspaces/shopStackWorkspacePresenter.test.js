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
import {
  createDefinitionMap,
  collectCatalogItems
} from '../../../src/ui/views/browser/components/shopstack/catalogData.js';
import { UPGRADE_DEFINITIONS } from '../../../src/game/upgrades/definitions/index.js';

function setupDomEnvironment(t) {
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
  return { dom, mount };
}

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

function createMultiCategoryModel() {
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
              }
            ]
          }
        ]
      },
      {
        id: 'support',
        copy: { label: 'Support' },
        families: [
          {
            id: 'crew',
            copy: { label: 'Crew' },
            definitions: [
              {
                id: 'supportBeacon',
                name: 'Support Beacon',
                cost: 900,
                description: 'A friendly help desk at the ready.',
                filters: { search: 'support beacon help desk' },
                snapshot: { ready: true, affordable: true },
                tag: { label: 'Support', type: 'support' }
              }
            ]
          }
        ]
      }
    ]
  };
}

function createMultiCategoryDefinitions(events) {
  return [
    {
      id: 'speedBoost',
      name: 'Speed Boost',
      details: ['Faster packing runs'],
      action: { onClick: () => events.push('speedBoost') }
    },
    {
      id: 'supportBeacon',
      name: 'Support Beacon',
      details: ['Round-the-clock helpers'],
      action: { onClick: () => events.push('supportBeacon') }
    }
  ];
}

function createWorkflowCatalogModel() {
  const createEntry = id => ({
    id,
    name: id,
    snapshot: { ready: true },
    filters: { search: id }
  });

  return {
    categories: [
      {
        id: 'tech',
        copy: { label: 'Tech' },
        families: [
          {
            id: 'workflow',
            copy: { label: 'Workflow' },
            definitions: [
              createEntry('course'),
              createEntry('editorialPipeline'),
              createEntry('syndicationSuite'),
              createEntry('immersiveStoryWorlds')
            ]
          },
          {
            id: 'gear',
            copy: { label: 'Gear' },
            definitions: [createEntry('creatorPhone')]
          }
        ]
      }
    ]
  };
}

test('createShopStackWorkspacePresenter renders catalog interactions and tabs', async t => {
  const { dom, mount } = setupDomEnvironment(t);
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

test('shopstack catalog buttons trigger rerenders for selection changes', async t => {
  const { dom, mount } = setupDomEnvironment(t);
  const events = [];
  const model = createMultiCategoryModel();
  const definitions = createMultiCategoryDefinitions(events);

  const presenter = createShopStackWorkspacePresenter();
  presenter.render(model, { mount, definitions });

  const cards = [...mount.querySelectorAll('.shopstack-card')];
  assert.equal(cards.length, 2);
  const supportCard = cards.find(card => card.dataset.upgrade === 'supportBeacon');
  assert.ok(supportCard, 'support card should render');

  supportCard.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const detailTitle = mount.querySelector('.shopstack-detail__title');
  assert.match(detailTitle.textContent, /Support Beacon/);

  const categoryButtons = [...mount.querySelectorAll('.shopstack-chip')];
  const supportButton = categoryButtons.find(button => button.textContent.includes('Support'));
  assert.ok(supportButton, 'support category button should exist');

  supportButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

  const updatedButtons = [...mount.querySelectorAll('.shopstack-chip')];
  const activeButton = updatedButtons.find(button => button.classList.contains('is-active'));
  assert.ok(activeButton, 'an active category button should be highlighted');
  assert.match(activeButton.textContent, /Support/);

  const filteredCards = [...mount.querySelectorAll('.shopstack-card')];
  assert.equal(filteredCards.length, 1);
  assert.equal(filteredCards[0].dataset.upgrade, 'supportBeacon');
});

test('shopstack catalog excludes workspace-specific workflow upgrades', () => {
  const definitionMap = createDefinitionMap(UPGRADE_DEFINITIONS);
  const model = createWorkflowCatalogModel();

  const collectIdsFor = placement =>
    collectCatalogItems(model, definitionMap, { placement }).map(item => item.model.id);

  const shopstackIds = collectIdsFor('shopstack');
  assert.ok(shopstackIds.includes('creatorPhone'), 'general tech upgrades should still appear in ShopStack');
  ['course', 'editorialPipeline', 'syndicationSuite', 'immersiveStoryWorlds'].forEach(id => {
    assert.ok(!shopstackIds.includes(id), `${id} should be filtered from ShopStack`);
  });

  const blogpressIds = collectIdsFor('blogpress');
  ['course', 'editorialPipeline', 'syndicationSuite', 'immersiveStoryWorlds'].forEach(id => {
    assert.ok(blogpressIds.includes(id), `${id} should appear on BlogPress`);
  });

  const digishelfIds = collectIdsFor('digishelf');
  assert.ok(!digishelfIds.includes('course'), 'Course should be BlogPress-exclusive');
  assert.ok(!digishelfIds.includes('editorialPipeline'), 'Editorial pipeline should be BlogPress-only');
  ['syndicationSuite', 'immersiveStoryWorlds'].forEach(id => {
    assert.ok(digishelfIds.includes(id), `${id} should appear on DigiShelf`);
  });

  const videotubeIds = collectIdsFor('videotube');
  assert.ok(!videotubeIds.includes('course'), 'Course should be BlogPress-exclusive');
  assert.ok(!videotubeIds.includes('editorialPipeline'), 'Editorial pipeline should be BlogPress-only');
  ['syndicationSuite', 'immersiveStoryWorlds'].forEach(id => {
    assert.ok(videotubeIds.includes(id), `${id} should appear on VideoTube`);
  });
});
